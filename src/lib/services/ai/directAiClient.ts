/**
 * Direct AI Client — browser-to-server AI calls.
 *
 * Calls the unified `/api/ai` SvelteKit route which proxies to the OpenAI API
 * and records usage for billing. All direct AI consumers (ChatDrawer, etc.)
 * go through this client.
 */

import type { AIRequestConfig, AIRequestOptions, AIResponse, UsageContext } from './types.js';
import { AIError } from './types.js';
import { buildRequestBody } from './messageBuilder.js';
import { parseDirectResponse } from './responseParser.js';
import { createLogger } from '$lib/utils/logger';

const log = createLogger('ai.direct');

const DEFAULT_TIMEOUT_MS = 60_000;
const DEFAULT_RETRIES = 1;
const RETRY_DELAY_MS = 1000;

/**
 * Send an AI query to the unified server route.
 *
 * @param config - Model, messages, and generation parameters
 * @param usage  - Billing context (required for metering)
 * @param options - Timeout, retries, abort signal
 */
export async function queryAI(
	config: AIRequestConfig,
	usage: UsageContext,
	options?: AIRequestOptions
): Promise<AIResponse> {
	const maxRetries = options?.retries ?? DEFAULT_RETRIES;
	const timeout = options?.timeout ?? DEFAULT_TIMEOUT_MS;

	let lastError: unknown;

	for (let attempt = 0; attempt <= maxRetries; attempt++) {
		try {
			return await doRequest(config, usage, timeout, options?.signal);
		} catch (err) {
			lastError = err;
			if (err instanceof AIError && !err.retryable) throw err;
			if (options?.signal?.aborted) throw err;
			if (attempt < maxRetries) {
				log.warn(`AI request attempt ${attempt + 1} failed, retrying...`, err);
				await sleep(RETRY_DELAY_MS * (attempt + 1));
			}
		}
	}

	throw lastError instanceof AIError
		? lastError
		: new AIError(
				lastError instanceof Error ? lastError.message : 'AI request failed',
				'REQUEST_FAILED',
				{ retryable: false, cause: lastError }
			);
}

async function doRequest(
	config: AIRequestConfig,
	usage: UsageContext,
	timeout: number,
	signal?: AbortSignal
): Promise<AIResponse> {
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), timeout);

	if (signal) {
		signal.addEventListener('abort', () => controller.abort(), { once: true });
	}

	try {
		const body = {
			...buildRequestBody(config),
			usage
		};

		const res = await fetch('/api/ai', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body),
			signal: controller.signal
		});

		if (!res.ok) {
			const text = await res.text().catch(() => '');
			const retryable = res.status >= 500 || res.status === 429;
			throw new AIError(
				`AI request failed: ${res.status} ${text}`,
				res.status === 429 ? 'RATE_LIMITED' : 'UPSTREAM_ERROR',
				{ status: res.status, retryable }
			);
		}

		const data = await res.json();
		if (data.error) {
			throw new AIError(data.error, 'UPSTREAM_ERROR', { retryable: false });
		}

		return parseDirectResponse(data);
	} finally {
		clearTimeout(timeoutId);
	}
}

function sleep(ms: number): Promise<void> {
	return new Promise((r) => setTimeout(r, ms));
}
