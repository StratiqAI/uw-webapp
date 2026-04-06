/**
 * Shared message and request body builder for direct AI calls.
 *
 * Provides a single `buildMessages()` and `buildRequestBody()` that all
 * direct-AI callers (ChatDrawer, future features) use instead of duplicating
 * message formatting logic.
 */

import type { AIMessage, AIRequestConfig, AIToolDefinition, AIResponseFormat } from './types.js';

const VALID_ROLES = new Set(['system', 'user', 'assistant', 'tool', 'developer']);

/**
 * Sanitise and normalise a raw message array.
 *
 * - Filters out messages with invalid roles
 * - Strips empty-content messages
 * - Optionally prepends a system prompt
 */
export function buildMessages(
	raw: Array<{ role: string; content: string; [k: string]: unknown }>,
	systemPrompt?: string
): AIMessage[] {
	const messages: AIMessage[] = [];

	if (systemPrompt) {
		messages.push({ role: 'system', content: systemPrompt });
	}

	for (const msg of raw) {
		if (!VALID_ROLES.has(msg.role)) continue;
		if (!msg.content?.trim()) continue;
		messages.push({
			role: msg.role as AIMessage['role'],
			content: msg.content,
			...(msg.name ? { name: msg.name as string } : {}),
			...(msg.toolCallId ? { toolCallId: msg.toolCallId as string } : {})
		});
	}

	return messages;
}

/**
 * Build a request body suitable for the unified `/api/ai` route.
 */
export function buildRequestBody(
	config: AIRequestConfig,
	opts?: {
		tools?: AIToolDefinition[];
		responseFormat?: AIResponseFormat;
	}
): Record<string, unknown> {
	const body: Record<string, unknown> = {
		model: config.model,
		messages: config.messages,
	};

	if (config.temperature !== undefined) body.temperature = config.temperature;
	if (config.maxTokens !== undefined) body.maxTokens = config.maxTokens;
	if (config.topP !== undefined) body.topP = config.topP;
	if (config.frequencyPenalty !== undefined) body.frequencyPenalty = config.frequencyPenalty;

	const tools = opts?.tools ?? config.tools;
	if (tools?.length) body.tools = tools;

	const fmt = opts?.responseFormat ?? config.responseFormat;
	if (fmt) body.responseFormat = fmt;

	return body;
}
