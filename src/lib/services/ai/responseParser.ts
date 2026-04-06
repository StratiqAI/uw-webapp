/**
 * Normalise AI responses from different sources into a unified AIResponse shape.
 *
 * Handles:
 * - OpenAI Responses API output (from /api/ai route)
 * - AiQueryExecution.rawOutput (from backend execution pipeline)
 */

import type { AIResponse, AIToolCall, AITokenUsage } from './types.js';

/**
 * Parse a response from the unified `/api/ai` server route.
 *
 * The route returns `{ reply, usage?, toolCalls?, raw? }`.
 */
export function parseDirectResponse(data: Record<string, unknown>): AIResponse {
	const usage = data.usage as Record<string, number> | undefined;

	return {
		content: (data.reply as string) ?? '',
		toolCalls: data.toolCalls as AIToolCall[] | undefined,
		usage: usage
			? {
					promptTokens: usage.promptTokens ?? usage.prompt_tokens ?? 0,
					completionTokens: usage.completionTokens ?? usage.completion_tokens ?? 0,
					totalTokens: usage.totalTokens ?? usage.total_tokens ?? 0
				}
			: undefined,
		raw: data.raw
	};
}

/**
 * Parse `rawOutput` from an AiQueryExecution record.
 *
 * The worker stores output as either plain text or stringified JSON
 * (from `generateObject`). Token counts come from separate fields
 * on the execution record.
 */
export function parseExecutionOutput(
	rawOutput: string | null | undefined,
	tokenCounts?: {
		promptTokenCount?: number | null;
		candidatesTokenCount?: number | null;
		totalTokenCount?: number | null;
	}
): AIResponse {
	if (!rawOutput) {
		return { content: '', usage: toUsage(tokenCounts) };
	}

	// Try JSON first -- generateObject produces stringified JSON
	try {
		const parsed = JSON.parse(rawOutput);
		if (typeof parsed === 'object' && parsed !== null) {
			const text = parsed.output_parsed
				? JSON.stringify(parsed.output_parsed)
				: JSON.stringify(parsed);
			return { content: text, usage: toUsage(tokenCounts), raw: parsed };
		}
	} catch {
		// Not JSON — treat as plain text
	}

	return { content: rawOutput, usage: toUsage(tokenCounts) };
}

function toUsage(counts?: {
	promptTokenCount?: number | null;
	candidatesTokenCount?: number | null;
	totalTokenCount?: number | null;
}): AITokenUsage | undefined {
	if (!counts) return undefined;
	const p = counts.promptTokenCount ?? 0;
	const c = counts.candidatesTokenCount ?? 0;
	const t = counts.totalTokenCount ?? p + c;
	if (t === 0 && p === 0 && c === 0) return undefined;
	return { promptTokens: p, completionTokens: c, totalTokens: t };
}
