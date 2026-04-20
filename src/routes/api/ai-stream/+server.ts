/**
 * SSE streaming AI query execution — server-side vision RAG / text template + Gemini stream.
 * Persists AIQueryExecution via AppSync (user JWT). Auth: hooks.server.ts + cookies.
 */

import type { RequestHandler } from './$types';
import { createHash, randomUUID } from 'node:crypto';
import { createLogger } from '$lib/utils/logger';
import { gql } from '$lib/services/realtime/graphql/requestHandler';
import {
	M_CREATE_AI_QUERY_EXECUTION,
	M_UPDATE_AI_QUERY_EXECUTION,
	Q_GET_AI_QUERY_EXECUTION,
	Q_LIST_DOCLINKS
} from '@stratiqai/types-simple';
import type { AiQueryExecution } from '@stratiqai/types-simple';
import { env } from '$env/dynamic/private';
import { resolveStreamInputs } from '$lib/server/ai/resolve-inputs.js';
import { streamVisionRag } from '$lib/server/ai/vision-rag-stream.js';
import { streamTextTemplate } from '$lib/server/ai/generate-stream.js';
import { compileTemplate, classifyErrorCode } from '$lib/server/ai/utils.js';
import type { StreamRequestBody } from '$lib/server/ai/types.js';
import { apiBreadcrumb } from '$lib/server/api-breadcrumbs.js';

const log = createLogger('api.ai-stream');

/**
 * Vercel Serverless buffers the function response (~4.5 MB hard cap per invocation).
 * Sending an entire cached `rawOutput` as one SSE frame can exceed that. Split large text.
 */
const SSE_TEXT_CHUNK_CHARS = 256 * 1024;

function enqueueTextChunks(send: (data: object) => void, fullText: string): void {
	if (fullText.length <= SSE_TEXT_CHUNK_CHARS) {
		send({ type: 'chunk', text: fullText });
		return;
	}
	for (let i = 0; i < fullText.length; i += SSE_TEXT_CHUNK_CHARS) {
		send({ type: 'chunk', text: fullText.slice(i, i + SSE_TEXT_CHUNK_CHARS) });
	}
}

function isValidExecutionId(s: string): boolean {
	if (typeof s !== 'string' || s.length === 0) return false;
	const uuidRegex =
		/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
	if (uuidRegex.test(s)) return true;
	return /^[0-9a-f]{32,128}$/i.test(s);
}

function hashExecutionId(
	promptId: string,
	inputValues: Record<string, unknown>,
	documentIds: string[]
): string {
	const payload = JSON.stringify({ promptId, inputValues, documentIds: documentIds ?? [] });
	return createHash('sha256').update(payload).digest('hex');
}

function streamingConfigOk(): boolean {
	const project = env.GOOGLE_PROJECT_ID ?? env.GOOGLE_CLOUD_PROJECT ?? '';
	return !!project;
}

async function resolveDocumentIds(
	body: StreamRequestBody,
	idToken: string
): Promise<string[]> {
	let documentIds = (body.documentIds ?? []).filter((id): id is string => id != null && id !== '');
	if (documentIds.length === 0 && body.projectId) {
		try {
			const doclinkResult = await gql<{
				listDoclinks?: { items?: Array<{ documentId?: string | null; deletedAt?: string | null }> };
			}>(Q_LIST_DOCLINKS, { parentId: body.projectId, limit: 100 }, idToken);
			const items = doclinkResult?.listDoclinks?.items ?? [];
			documentIds = items
				.filter((d) => d.documentId && !d.deletedAt)
				.map((d) => d.documentId!);
		} catch (err) {
			log.warn('doclink_fallback_failed', {
				projectId: body.projectId,
				error: err instanceof Error ? err.message : String(err)
			});
		}
	}
	return documentIds;
}

export const POST: RequestHandler = async ({ request, cookies }) => {
	const rid = randomUUID().slice(0, 12);
	apiBreadcrumb('POST /api/ai-stream', 'begin', { rid });

	const idToken = cookies.get('id_token');
	if (!idToken) {
		return new Response(JSON.stringify({ error: 'Unauthorized' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	if (!streamingConfigOk()) {
		return new Response(
			JSON.stringify({ error: 'Server misconfigured: GOOGLE_PROJECT_ID is required for streaming AI.' }),
			{ status: 503, headers: { 'Content-Type': 'application/json' } }
		);
	}

	let body: StreamRequestBody;
	try {
		body = (await request.json()) as StreamRequestBody;
		apiBreadcrumb('POST /api/ai-stream', 'parsed_body', {
			rid,
			promptIdLen: typeof body.promptId === 'string' ? body.promptId.length : 0,
			projectIdLen: typeof body.projectId === 'string' ? body.projectId.length : 0
		});
	} catch {
		return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	if (!body.promptId || body.projectId == null || body.inputValues == null) {
		return new Response(JSON.stringify({ error: 'promptId, projectId, and inputValues are required' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const documentIds = await resolveDocumentIds(body, idToken);
	apiBreadcrumb('POST /api/ai-stream', 'document_ids', { rid, docCount: documentIds.length });

	let executionId = body.executionId?.trim();
	if (executionId) {
		if (!isValidExecutionId(executionId)) {
			return new Response(JSON.stringify({ error: 'Invalid executionId' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' }
			});
		}
	} else {
		executionId = hashExecutionId(body.promptId, body.inputValues, documentIds);
	}

	// Cache / in-flight: existing execution by deterministic id
	try {
		const existingResult = await gql<{ getAIQueryExecution: AiQueryExecution | null }>(
			Q_GET_AI_QUERY_EXECUTION,
			{ id: executionId },
			idToken
		);
		const existing = existingResult?.getAIQueryExecution;
		if (existing?.status === 'SUCCESS' && existing.rawOutput != null) {
			const raw = existing.rawOutput;
			const rawLen = typeof raw === 'string' ? raw.length : String(raw ?? '').length;
			apiBreadcrumb('POST /api/ai-stream', 'cache_hit_sse', {
				rid,
				rawOutputChars: rawLen
			});
			const encoder = new TextEncoder();
			const out = existing.rawOutput;
			const stream = new ReadableStream({
				start(controller) {
					const send = (data: object) => {
						controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
					};
					send({
						type: 'started',
						id: existing.id,
						executionId: existing.executionId ?? executionId
					});
					send({
						type: 'meta',
						cached: true,
						promptTokenCount: existing.promptTokenCount ?? 0,
						candidatesTokenCount: existing.candidatesTokenCount ?? 0
					});
					enqueueTextChunks(send, typeof out === 'string' ? out : String(out ?? ''));
					send({
						type: 'done',
						executionId: existing.executionId ?? executionId,
						id: existing.id
					});
					controller.close();
				}
			});
			return new Response(stream, {
				headers: {
					'Content-Type': 'text/event-stream',
					'Cache-Control': 'no-cache',
					Connection: 'keep-alive'
				}
			});
		}
		if (existing && (existing.status === 'QUEUED' || existing.status === 'PROCESSING')) {
			return new Response(
				JSON.stringify({ error: 'Execution already in progress', executionId: existing.id }),
				{ status: 409, headers: { 'Content-Type': 'application/json' } }
			);
		}
	} catch {
		// ignore cache lookup errors; continue to create
	}

	const resolved = await resolveStreamInputs(body, documentIds, idToken);
	apiBreadcrumb('POST /api/ai-stream', 'resolve_inputs_done', {
		rid,
		ok: resolved.kind === 'resolved'
	});
	if (resolved.kind === 'error') {
		return new Response(
			JSON.stringify({ error: resolved.errorMessage, code: resolved.errorCode }),
			{ status: 400, headers: { 'Content-Type': 'application/json' } }
		);
	}

	const r = resolved.data;
	const inputValuesStr = JSON.stringify(body.inputValues ?? {});

	const priority =
		body.priority && ['HIGH', 'MEDIUM', 'LOW'].includes(body.priority.toUpperCase())
			? body.priority.toUpperCase()
			: 'MEDIUM';
	const queuedAt = new Date().toISOString();

	let execution: AiQueryExecution;
	try {
		const createResult = await gql<{ createAIQueryExecution: AiQueryExecution | null }>(
			M_CREATE_AI_QUERY_EXECUTION,
			{
				input: {
					projectId: body.projectId,
					promptId: body.promptId,
					executionId,
					inputValues: inputValuesStr,
					...(documentIds.length > 0 && { documentIds }),
					...(body.topK != null && { topK: body.topK }),
					...(body.topKPerNs != null && { topKPerNs: body.topKPerNs }),
					priority,
					statusMessage: 'Streaming…',
					queuedAt
				}
			},
			idToken
		);
		const created = createResult?.createAIQueryExecution;
		if (!created?.id) {
			throw new Error('createAIQueryExecution returned no execution');
		}
		execution = created;
	} catch (err) {
		log.error('create_execution_failed', err);
		return new Response(
			JSON.stringify({
				error: err instanceof Error ? err.message : 'Failed to create execution'
			}),
			{ status: 502, headers: { 'Content-Type': 'application/json' } }
		);
	}

	const execRecordId = execution.id;
	apiBreadcrumb('POST /api/ai-stream', 'execution_created', { rid, execRecordIdLen: execRecordId.length });

	try {
		await gql(
			M_UPDATE_AI_QUERY_EXECUTION,
			{
				id: execRecordId,
				input: {
					status: 'PROCESSING',
					startedAt: new Date().toISOString(),
					statusMessage: 'Processing…',
					model: r.modelId
				}
			},
			idToken
		);
	} catch (e) {
		log.warn('update_processing_failed', e);
	}

	const encoder = new TextEncoder();
	const streamStartedAt = Date.now();
	const stream = new ReadableStream({
		async start(controller) {
			const send = (data: object) => {
				controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
			};

			let fullText = '';
			try {
				apiBreadcrumb('POST /api/ai-stream', 'sse_stream_open', {
					rid,
					hasVisionRag: !!r.visionRag
				});
				send({
					type: 'started',
					id: execRecordId,
					executionId: execution.executionId ?? executionId
				});

				if (r.visionRag) {
					const meta = await streamVisionRag(
						r.visionRag,
						r.schemaDefinition,
						r.client,
						r.modelId,
						(t) => {
							fullText += t;
							enqueueTextChunks(send, t);
						}
					);
					send({
						type: 'meta',
						promptTokenCount: meta.promptTokenCount,
						candidatesTokenCount: meta.candidatesTokenCount,
						totalTokenCount: meta.promptTokenCount + meta.candidatesTokenCount
					});
				} else {
				const compiled = compileTemplate(r.promptText, r.variables);
				const meta = await streamTextTemplate(
					compiled,
					r.schemaDefinition,
					r.client,
					r.modelId,
					{ googleSearch: body.googleSearchEnabled !== false },
					(t) => {
						fullText += t;
						enqueueTextChunks(send, t);
					}
				);
					send({
						type: 'meta',
						promptTokenCount: meta.promptTokenCount,
						candidatesTokenCount: meta.candidatesTokenCount,
						totalTokenCount: meta.promptTokenCount + meta.candidatesTokenCount
					});
				}

				const durationMs = Date.now() - streamStartedAt;
				apiBreadcrumb('POST /api/ai-stream', 'sse_generation_done', {
					rid,
					durationMs,
					fullTextChars: fullText.length
				});

				await gql(
					M_UPDATE_AI_QUERY_EXECUTION,
					{
						id: execRecordId,
						input: {
							status: 'SUCCESS',
							statusMessage: 'Completed',
							rawOutput: fullText,
							executedAt: new Date().toISOString(),
							durationMs,
							model: r.modelId
						}
					},
					idToken
				);

				send({
					type: 'done',
					executionId: execution.executionId ?? executionId,
					id: execRecordId
				});
			} catch (err: unknown) {
				const message = err instanceof Error ? err.message : 'Unknown error';
				const code = classifyErrorCode(message);
				apiBreadcrumb('POST /api/ai-stream', 'sse_stream_error', {
					rid,
					code,
					messageLen: message.length
				});
				send({ type: 'error', message, code });
				try {
					await gql(
						M_UPDATE_AI_QUERY_EXECUTION,
						{
							id: execRecordId,
							input: {
								status: 'ERROR',
								errorMessage: message,
								errorCode: code
							}
						},
						idToken
					);
				} catch {
					// ignore
				}
			} finally {
				controller.close();
			}
		}
	});

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			Connection: 'keep-alive'
		}
	});
};
