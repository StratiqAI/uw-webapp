/**
 * AI Studio chat: Vertex Gemini via Vercel AI SDK (streamText → UI message stream).
 */

import { Buffer } from 'node:buffer';
import { createVertex } from '@ai-sdk/google-vertex';
import {
	convertToModelMessages,
	jsonSchema,
	Output,
	stepCountIs,
	streamText,
	tool,
	type ModelMessage,
	type ToolSet,
	type UIMessage
} from 'ai';
import { z } from 'zod';
import type { AiStudioToolsConfig } from '$lib/types/ai-studio.js';
import { getGcpProjectAndLocation } from './gemini-client.js';
import { sanitizeSchema } from './generate-stream.js';

function hasSchemaKeys(schema: Record<string, unknown> | null | undefined): schema is Record<string, unknown> {
	return schema != null && typeof schema === 'object' && Object.keys(schema).length > 0;
}

function buildAiStudioTools(
	vertex: ReturnType<typeof createVertex>,
	toolsConfig: AiStudioToolsConfig
): ToolSet {
	const tools: ToolSet = {};

	if (toolsConfig.googleSearch === true) {
		tools.googleSearch = vertex.tools.googleSearch({});
	}
	if (toolsConfig.googleMaps === true) {
		tools.googleMaps = vertex.tools.googleMaps({});
	}
	if (toolsConfig.urlContext === true) {
		tools.urlContext = vertex.tools.urlContext({});
	}
	if (toolsConfig.codeExecution === true) {
		tools.codeExecution = vertex.tools.codeExecution({});
	}

	const fc = toolsConfig.functionCalling;
	if (fc && typeof fc === 'object' && Array.isArray(fc.declarations)) {
		for (const decl of fc.declarations) {
			const name = decl.name?.trim();
			if (!name) continue;
			tools[name] = tool({
				description: decl.description ?? name,
				inputSchema: decl.parameters
					? jsonSchema(decl.parameters as Record<string, unknown>)
					: z.object({}),
				execute: async (input: unknown) => ({ result: input })
			});
		}
	}

	return tools;
}

function injectCompiledLastUserMessage(
	modelMessages: ModelMessage[],
	compiledText: string,
	pdfBase64: string | null
): ModelMessage[] {
	const userContent =
		pdfBase64 && pdfBase64.length > 0
			? [
					{ type: 'text' as const, text: compiledText },
					{
						type: 'file' as const,
						data: Buffer.from(pdfBase64, 'base64'),
						mediaType: 'application/pdf'
					}
				]
			: compiledText;

	const replacement: ModelMessage =
		typeof userContent === 'string'
			? { role: 'user', content: userContent }
			: { role: 'user', content: userContent };

	const roles = modelMessages.map((m) => m.role);
	const idx = roles.lastIndexOf('user');
	if (idx === -1) {
		return [...modelMessages, replacement];
	}
	const next = modelMessages.slice();
	next[idx] = replacement;
	return next;
}

export interface AiStudioVertexStreamParams {
	uiMessages: UIMessage[];
	compiledPrompt: string;
	pdfInlineBase64: string | null;
	toolsConfig: AiStudioToolsConfig;
	/** JSON schema when structured response is enabled. */
	effectiveSchema: Record<string, unknown> | null | undefined;
	applyStructured: boolean;
	googleGroundingActive: boolean;
	modelId: string;
	systemInstruction?: string;
	abortSignal: AbortSignal;
}

export async function createAiStudioVertexStreamResponse(
	params: AiStudioVertexStreamParams
): Promise<Response> {
	const {
		uiMessages,
		compiledPrompt,
		pdfInlineBase64,
		toolsConfig,
		effectiveSchema,
		applyStructured,
		googleGroundingActive,
		modelId,
		systemInstruction,
		abortSignal
	} = params;

	const { projectId, location } = getGcpProjectAndLocation();
	if (!projectId) {
		return new Response(JSON.stringify({ error: 'GOOGLE_PROJECT_ID is not configured' }), {
			status: 503,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const vertex = createVertex({
		project: projectId,
		location: location || 'us-central1'
	});

	const tools = buildAiStudioTools(vertex, toolsConfig);
	const hasTools = Object.keys(tools).length > 0;

	const useStructured =
		applyStructured &&
		hasSchemaKeys(effectiveSchema) &&
		!googleGroundingActive;

	let converted: ModelMessage[];
	try {
		converted = await convertToModelMessages(uiMessages, {
			tools,
			ignoreIncompleteToolCalls: true
		});
	} catch (e) {
		const msg = e instanceof Error ? e.message : 'Invalid messages';
		return new Response(JSON.stringify({ error: msg }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	try {
		const messages = injectCompiledLastUserMessage(
			converted,
			compiledPrompt,
			googleGroundingActive ? null : pdfInlineBase64
		);

		const system = systemInstruction?.trim() ?? '';

		const common = {
			model: vertex(modelId),
			messages,
			...(system ? { system } : {}),
			...(hasTools ? { tools } : {}),
			stopWhen: stepCountIs(8),
			abortSignal
		};

		if (useStructured && effectiveSchema) {
			const schema = sanitizeSchema(effectiveSchema);
			const streamTextInput = {
				...common,
				output: Output.object({
					schema: jsonSchema(schema as Record<string, unknown>)
				})
			};
			console.log('streamTextInput', streamTextInput);

			/////////////////////////////////////////////////////////////////////////////////////////////////////
			/////////////////////////////////////////////////////////////////////////////////////////////////////
			// The actual call to the AI model
			/////////////////////////////////////////////////////////////////////////////////////////////////////
			const result = streamText(streamTextInput);
			/////////////////////////////////////////////////////////////////////////////////////////////////////

			return result.toUIMessageStreamResponse({
				originalMessages: uiMessages,
				sendReasoning: true
			});
		}

		console.log('common', common);
		const result = streamText(common);
		return result.toUIMessageStreamResponse({
			originalMessages: uiMessages,
			sendReasoning: true
		});
	} catch (e) {
		const msg = e instanceof Error ? e.message : 'Generation failed';
		return new Response(JSON.stringify({ error: msg }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
}
