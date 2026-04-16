/**
 * AI Studio — streaming Vertex Gemini (SSE) for text templates.
 * No AppSync submitAIQuery / no SQS. Auth: id_token cookie.
 */

import { Buffer } from 'node:buffer';
import { PUBLIC_DOCUMENTS_BUCKET, PUBLIC_REGION } from '$env/static/public';
import type { RequestHandler } from './$types';
import { createLogger } from '$lib/utils/logger';
import { resolveStreamInputs } from '$lib/server/ai/resolve-inputs.js';
import { streamTextTemplate } from '$lib/server/ai/generate-stream.js';
import { compileTemplate, classifyErrorCode } from '$lib/server/ai/utils.js';
import type { StreamRequestBody } from '$lib/server/ai/types.js';
import type { AiStudioToolsConfig } from '$lib/types/ai-studio.js';

const log = createLogger('api.ai-studio');

/** Avoid SSRF / path injection: only project document ids used in our S3 key layout. */
function isSafeWorkspaceDocumentId(id: string): boolean {
	return /^[a-zA-Z0-9_-]{4,128}$/.test(id);
}

const MAX_INLINE_PDF_BYTES = 32 * 1024 * 1024;

function workspacePdfObjectUrl(documentId: string): string {
	return `https://${PUBLIC_DOCUMENTS_BUCKET}.s3.${PUBLIC_REGION}.amazonaws.com/${documentId}/document.pdf`;
}

async function fetchPdfAsBase64(url: string): Promise<string | null> {
	const ctrl = new AbortController();
	const timeoutMs = 120_000;
	const timer = setTimeout(() => ctrl.abort(), timeoutMs);
	try {
		const res = await fetch(url, { signal: ctrl.signal });
		if (!res.ok) {
			log.warn('ai-studio.workspace_pdf_fetch_failed', { status: res.status, url });
			return null;
		}
		const lenHeader = res.headers.get('content-length');
		if (lenHeader) {
			const n = Number(lenHeader);
			if (Number.isFinite(n) && n > MAX_INLINE_PDF_BYTES) {
				log.warn('ai-studio.workspace_pdf_too_large', { bytes: n, max: MAX_INLINE_PDF_BYTES });
				return null;
			}
		}
		const buf = new Uint8Array(await res.arrayBuffer());
		if (buf.byteLength > MAX_INLINE_PDF_BYTES) {
			log.warn('ai-studio.workspace_pdf_too_large', { bytes: buf.byteLength, max: MAX_INLINE_PDF_BYTES });
			return null;
		}
		return Buffer.from(buf).toString('base64');
	} catch (err) {
		log.warn('ai-studio.workspace_pdf_fetch_error', { url, error: err instanceof Error ? err.message : String(err) });
		return null;
	} finally {
		clearTimeout(timer);
	}
}

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

	const toolsConfig: AiStudioToolsConfig = body.tools ?? {
		googleSearch: body.googleSearchEnabled !== false
	};

	const applyStructured = body.tools?.applyStructuredResponse !== false;

	let effectiveSchema: Record<string, unknown> | null | undefined =
		body.structuredOutput?.responseJsonSchema ?? schemaDefinition;

	if (!applyStructured) {
		effectiveSchema = undefined;
	}

	const googleGroundingActive = toolsConfig.googleSearch === true || toolsConfig.googleMaps === true;

	const rawWorkspaceDocId =
		typeof body.workspacePdfDocumentId === 'string' && !googleGroundingActive ? body.workspacePdfDocumentId.trim() : '';
	const workspacePdfUrl =
		rawWorkspaceDocId && isSafeWorkspaceDocumentId(rawWorkspaceDocId)
			? workspacePdfObjectUrl(rawWorkspaceDocId)
			: undefined;

	const variablesWithPdfUrl = workspacePdfUrl
		? { ...variables, currentPdfUrl: workspacePdfUrl }
		: variables;

	/** Chat / Run box sends `inputValues.question`; only merges via `{{ question }}` unless we use it as the template body. */
	const userQuestion =
		typeof variables.question === 'string' ? variables.question.trim() : '';
	const promptHasQuestionSlot = /\{\{\s*question\s*\}\}/.test(promptText);
	const basePromptForCompile =
		promptHasQuestionSlot || !userQuestion ? promptText : userQuestion;

	let compiled: string;
	try {
		compiled = compileTemplate(basePromptForCompile, variablesWithPdfUrl);
	} catch (err) {
		log.error('ai-studio.template_failed', err);
		return new Response(JSON.stringify({ error: 'Failed to compile prompt template' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	if (workspacePdfUrl) {
		compiled =
			`[Workspace PDF]\nThe user is viewing this document in the prompt workspace.\nPDF URL: ${workspacePdfUrl}\n` +
			`The same file is attached below as application/pdf when fetch succeeded; answer using the attachment and/or URL.\n\n` +
			compiled;
	}

	let pdfInlineBase64: string | null = null;
	if (workspacePdfUrl) {
		pdfInlineBase64 = await fetchPdfAsBase64(workspacePdfUrl);
		if (!pdfInlineBase64) {
			compiled +=
				'\n\n[Note: The PDF could not be loaded on the server for inline attachment; use the URL above if you can access it.]\n';
		}
	} else if (typeof body.workspacePdfDocumentId === 'string' && body.workspacePdfDocumentId.trim() && googleGroundingActive) {
		compiled +=
			'\n\n[Note: The PDF attachment was omitted because Grounding with Google Search or Maps is enabled (they do not support PDF inlineData).]\n';
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
					effectiveSchema,
					client,
					modelId,
					toolsConfig,
					(t) => {
						fullText += t;
						send({ type: 'chunk', text: t });
					},
					{ pdfInlineBase64 }
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
