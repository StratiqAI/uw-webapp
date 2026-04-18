/**
 * Text-template Gemini streaming via @google/genai (Vertex).
 */

import type { GoogleGenAI, Tool } from '@google/genai';
import type { AiStudioToolsConfig } from '$lib/types/ai-studio.js';
import { withRetry } from './utils.js';

function hasSchemaKeys(schema: Record<string, unknown> | null | undefined): schema is Record<string, unknown> {
	return schema != null && typeof schema === 'object' && Object.keys(schema).length > 0;
}

/** Exported for AI SDK structured output (ai-studio Vertex stream). */
export function sanitizeSchema(schema: Record<string, unknown>): Record<string, unknown> {
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

/**
 * Build the `Tool[]` array for `@google/genai` from our high-level config.
 */
function buildToolsList(cfg: AiStudioToolsConfig): Tool[] {
	const tools: Tool[] = [];

	if (cfg.googleSearch) tools.push({ googleSearch: {} });
	if (cfg.googleMaps) tools.push({ googleMaps: {} });
	if (cfg.urlContext) tools.push({ urlContext: {} });
	if (cfg.codeExecution) tools.push({ codeExecution: {} });

	if (cfg.functionCalling) {
		if (typeof cfg.functionCalling === 'object' && cfg.functionCalling.declarations?.length) {
			tools.push({
				functionDeclarations: cfg.functionCalling.declarations.map((d) => ({
					name: d.name,
					description: d.description,
					...(d.parameters ? { parametersJsonSchema: d.parameters } : {})
				}))
			});
		}
	}

	return tools;
}

export interface TextStreamMeta {
	promptTokenCount: number;
	candidatesTokenCount: number;
	retryCount: number;
}

export type StreamTextTemplateOptions = {
	/** Base64 PDF body for Gemini multimodal. */
	pdfInlineBase64?: string | null;
};

/**
 * Stream Gemini text for a compiled prompt; retries only the stream setup on 429/5xx.
 */
export async function streamTextTemplate(
	compiledPrompt: string,
	responseSchema: Record<string, unknown> | null | undefined,
	client: GoogleGenAI,
	modelId: string,
	toolsConfig: AiStudioToolsConfig,
	onChunk: (text: string) => void,
	options?: StreamTextTemplateOptions
): Promise<TextStreamMeta> {
	const hasSchema = hasSchemaKeys(responseSchema);
	const googleSearchActive = toolsConfig.googleSearch === true || toolsConfig.googleMaps === true;
	const useStructured = hasSchema && !googleSearchActive;

	const tools = buildToolsList(toolsConfig);

	const pdfB64 = !googleSearchActive ? options?.pdfInlineBase64 : null;
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
				...(tools.length > 0 && { tools }),
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
