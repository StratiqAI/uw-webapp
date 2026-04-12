/**
 * Text-template Gemini streaming via @google/genai (Vertex).
 */

import type { GoogleGenAI } from '@google/genai';
import { withRetry } from './utils.js';

function hasSchemaKeys(schema: Record<string, unknown> | null | undefined): schema is Record<string, unknown> {
	return schema != null && typeof schema === 'object' && Object.keys(schema).length > 0;
}

function sanitizeSchema(schema: Record<string, unknown>): Record<string, unknown> {
	const { $schema, additionalProperties, ...rest } = schema;
	const cleaned: Record<string, unknown> = { ...rest };
	if (cleaned.properties && typeof cleaned.properties === 'object') {
		const props: Record<string, unknown> = {};
		for (const [k, v] of Object.entries(cleaned.properties as Record<string, unknown>)) {
			props[k] =
				typeof v === 'object' && v !== null ? sanitizeSchema(v as Record<string, unknown>) : v;
		}
		cleaned.properties = props;
	}
	if (cleaned.items && typeof cleaned.items === 'object') {
		cleaned.items = sanitizeSchema(cleaned.items as Record<string, unknown>);
	}
	return cleaned;
}

export interface TextStreamMeta {
	promptTokenCount: number;
	candidatesTokenCount: number;
	retryCount: number;
}

/**
 * Stream Gemini text for a compiled prompt; retries only the stream setup on 429/5xx.
 */
export type StreamTextTemplateOptions = {
	/** Base64 PDF body for Gemini multimodal (same pattern as document-processing examples). */
	pdfInlineBase64?: string | null;
};

export async function streamTextTemplate(
	compiledPrompt: string,
	responseSchema: Record<string, unknown> | null | undefined,
	client: GoogleGenAI,
	modelId: string,
	googleSearchEnabled: boolean,
	onChunk: (text: string) => void,
	options?: StreamTextTemplateOptions
): Promise<TextStreamMeta> {
	const hasSchema = hasSchemaKeys(responseSchema);
	const useStructured = hasSchema && !googleSearchEnabled;

	const pdfB64 = options?.pdfInlineBase64;
	const contents =
		pdfB64 && pdfB64.length > 0
			? [
					{ text: compiledPrompt },
					{ inlineData: { mimeType: 'application/pdf', data: pdfB64 } }
				]
			: compiledPrompt;

	const { result: stream, retryCount } = await withRetry(async () => {
		return await client.models.generateContentStream({
			model: modelId,
			contents,
			config: {
				...(googleSearchEnabled && { tools: [{ googleSearch: {} }] }),
				...(useStructured && {
					responseMimeType: 'application/json',
					responseSchema: sanitizeSchema(responseSchema!)
				})
			}
		});
	}, 'text-template-stream');

	let promptTokens = 0;
	let completionTokens = 0;

	for await (const chunk of stream) {
		const t = chunk.text ?? '';
		if (t) onChunk(t);
		if (chunk.usageMetadata) {
			promptTokens = chunk.usageMetadata.promptTokenCount ?? promptTokens;
			completionTokens = chunk.usageMetadata.candidatesTokenCount ?? completionTokens;
		}
	}

	return {
		promptTokenCount: promptTokens,
		candidatesTokenCount: completionTokens,
		retryCount
	};
}
