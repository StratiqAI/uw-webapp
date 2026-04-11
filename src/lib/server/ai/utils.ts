/**
 * Retry helpers and template compilation for server-side AI streaming.
 */

import { createLogger } from '$lib/utils/logger';

const log = createLogger('server.ai');

export function isRetryableError(err: unknown): boolean {
	const msg = err instanceof Error ? err.message : String(err);
	const lower = msg.toLowerCase();
	if (lower.includes('429') || lower.includes('too many requests')) return true;
	if (
		lower.includes('resource exhausted') ||
		lower.includes('resource_exhausted') ||
		lower.includes('overloaded')
	)
		return true;
	if (/\b5\d{2}\b/.test(msg)) return true;
	return false;
}

export function sleep(ms: number): Promise<void> {
	return new Promise((r) => setTimeout(r, ms));
}

export function jitter(ms: number, pct = 0.1): number {
	const delta = ms * pct;
	return Math.floor(ms + (Math.random() * 2 - 1) * delta);
}

export const BASE_DELAY_MS = 2000;
export const BACKOFF_RATE = 3;
export const MAX_RETRIES = 5;

export const ErrorCode = {
	PROMPT_NOT_FOUND: 'PROMPT_NOT_FOUND',
	SCHEMA_PARSE_ERROR: 'SCHEMA_PARSE_ERROR',
	MISSING_INPUT: 'MISSING_INPUT',
	VISION_CONFIG_MISSING: 'VISION_CONFIG_MISSING',
	API_KEY_MISSING: 'API_KEY_MISSING',
	RATE_LIMITED: 'RATE_LIMITED',
	TIMEOUT: 'TIMEOUT',
	AI_MODEL_ERROR: 'AI_MODEL_ERROR',
	INTERNAL_ERROR: 'INTERNAL_ERROR'
} as const;

export function classifyErrorCode(errorMessage: string): string {
	const lower = errorMessage.toLowerCase();
	if (
		lower.includes('429') ||
		lower.includes('resource exhausted') ||
		lower.includes('resource_exhausted') ||
		lower.includes('too many requests')
	) {
		return ErrorCode.RATE_LIMITED;
	}
	if (lower.includes('timeout') || lower.includes('timed out') || lower.includes('deadline exceeded')) {
		return ErrorCode.TIMEOUT;
	}
	if (lower.includes('unauthorized') || lower.includes('permission') || lower.includes('api key')) {
		return ErrorCode.API_KEY_MISSING;
	}
	if (lower.includes('schema') || lower.includes('json')) {
		return ErrorCode.SCHEMA_PARSE_ERROR;
	}
	return ErrorCode.AI_MODEL_ERROR;
}

/**
 * Exponential backoff retry for async operations (no deferred scheduler).
 */
export async function withRetry<T>(
	fn: (attempt: number) => Promise<T>,
	logTag?: string
): Promise<{ result: T; retryCount: number }> {
	let lastError: unknown;
	let retryCount = 0;

	for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
		try {
			const result = await fn(attempt);
			return { result, retryCount };
		} catch (err) {
			lastError = err;
			if (attempt < MAX_RETRIES && isRetryableError(err)) {
				retryCount = attempt + 1;
				const delay = jitter(BASE_DELAY_MS * Math.pow(BACKOFF_RATE, attempt));
				log.warn('server.ai.retry', {
					...(logTag && { path: logTag }),
					attempt: retryCount,
					delayMs: delay,
					error: err instanceof Error ? err.message : String(err)
				});
				await sleep(delay);
			} else {
				throw err;
			}
		}
	}
	throw lastError;
}

/** Replace {{ variableName }} placeholders in prompt text with values from variables. */
export function compileTemplate(promptText: string, variables: Record<string, unknown>): string {
	let out = promptText;
	for (const [key, value] of Object.entries(variables)) {
		const re = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
		out = out.replace(re, String(value ?? ''));
	}
	const unresolvedMatch = out.match(/\{\{\s*(\w+)\s*\}\}/);
	if (unresolvedMatch) {
		log.warn('server.ai.template.unresolved_variable', {
			variable: unresolvedMatch[1],
			providedKeys: Object.keys(variables)
		});
	}
	return out;
}
