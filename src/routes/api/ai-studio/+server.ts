/**
 * AI Studio — streaming Vertex Gemini (SSE) for text templates.
 * No AppSync submitAIQuery / no SQS. Auth: id_token cookie.
 */

import type { RequestHandler } from './$types';
import { createLogger } from '$lib/utils/logger';
import { resolveStreamInputs } from '$lib/server/ai/resolve-inputs.js';
import { streamTextTemplate } from '$lib/server/ai/generate-stream.js';
import { compileTemplate, classifyErrorCode } from '$lib/server/ai/utils.js';
import type { StreamRequestBody } from '$lib/server/ai/types.js';

const log = createLogger('api.ai-studio');

async function resolveDocumentIdsForCompat(body: StreamRequestBody): Promise<string[]> {
	return (body.documentIds ?? []).filter((id): id is string => id != null && id !== '');
}

export const POST: RequestHandler = async ({ request, cookies }) => {
	const idToken = cookies.get('id_token');
	if (!idToken) {
		return new Response(JSON.stringify({ error: 'Unauthorized' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	let body: StreamRequestBody;
	try {
		body = (await request.json()) as StreamRequestBody;
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

	const documentIdsFromRequest = await resolveDocumentIdsForCompat(body);

	const resolved = await resolveStreamInputs(body, documentIdsFromRequest, idToken, {
		disableVisionRag: true
	});

	if (resolved.kind === 'error') {
		const status =
			resolved.errorCode === 'PROMPT_NOT_FOUND'
				? 404
				: resolved.errorCode === 'API_KEY_MISSING'
					? 503
					: 400;
		return new Response(
			JSON.stringify({
				error: resolved.errorMessage,
				errorCode: resolved.errorCode
			}),
			{ status, headers: { 'Content-Type': 'application/json' } }
		);
	}

	const { client, modelId, schemaDefinition, variables, promptText } = resolved.data;
	const googleSearchEnabled = body.googleSearchEnabled !== false;

	let compiled: string;
	try {
		compiled = compileTemplate(promptText, variables);
	} catch (err) {
		log.error('ai-studio.template_failed', err);
		return new Response(JSON.stringify({ error: 'Failed to compile prompt template' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const encoder = new TextEncoder();
	const stream = new ReadableStream({
		async start(controller) {
			const send = (data: object) => {
				controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
			};

			try {
				let fullText = '';
				const meta = await streamTextTemplate(
					compiled,
					schemaDefinition,
					client,
					modelId,
					googleSearchEnabled,
					(t) => {
						fullText += t;
						send({ type: 'chunk', text: t });
					}
				);

				send({
					type: 'meta',
					promptTokenCount: meta.promptTokenCount,
					candidatesTokenCount: meta.candidatesTokenCount,
					totalTokenCount: meta.promptTokenCount + meta.candidatesTokenCount
				});
				send({ type: 'done', text: fullText });
			} catch (err) {
				const message = err instanceof Error ? err.message : 'Generation failed';
				log.error('ai-studio.stream_failed', err);
				send({
					type: 'error',
					message,
					errorCode: classifyErrorCode(message)
				});
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
