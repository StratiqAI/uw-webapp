/**
 * Execution Client — replaces jobManager.ts
 *
 * Submits AI queries via the canonical M_SUBMIT_AI_QUERY mutation and
 * subscribes to real-time updates via S_ON_UPDATE_AI_QUERY_EXECUTION.
 * Uses correct ExecutionStatus values and extracts rawOutput on success.
 */

import { writable, type Readable } from 'svelte/store';
import {
	M_SUBMIT_AI_QUERY,
	M_UPDATE_AI_QUERY_EXECUTION,
	S_ON_UPDATE_AI_QUERY_EXECUTION
} from '@stratiqai/types-simple';
import type { AiQueryExecution, ExecutionStatus } from '@stratiqai/types-simple';
import { gql } from '$lib/services/realtime/graphql/requestHandler';
import { ensureConnection, addSubscription, removeSubscription } from '$lib/stores/appSyncClientStore';
import type { SubscriptionSpec } from '$lib/services/realtime/websocket/types';
import { createLogger } from '$lib/utils/logger';
import type { SubmitExecutionInput, ExecutionHandle } from './types.js';
import { AIError } from './types.js';

const log = createLogger('ai.execution');

const TERMINAL_STATUSES: Set<string> = new Set(['SUCCESS', 'ERROR', 'CANCELLED']);

const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

// ---------------------------------------------------------------------------
// Simple LRU cache for execution results
// ---------------------------------------------------------------------------

interface CachedResult {
	rawOutput: string | null;
	timestamp: number;
}

const MAX_CACHE_SIZE = 50;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const resultCache = new Map<string, CachedResult>();

function getCachedResult(executionId: string): string | null | undefined {
	const entry = resultCache.get(executionId);
	if (!entry) return undefined;
	if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
		resultCache.delete(executionId);
		return undefined;
	}
	return entry.rawOutput;
}

function setCachedResult(executionId: string, rawOutput: string | null): void {
	if (resultCache.size >= MAX_CACHE_SIZE) {
		const oldest = resultCache.keys().next().value;
		if (oldest) resultCache.delete(oldest);
	}
	resultCache.set(executionId, { rawOutput, timestamp: Date.now() });
}

// ---------------------------------------------------------------------------
// Deterministic execution ID (SHA-256 based)
// ---------------------------------------------------------------------------

export async function calculateExecutionId(
	promptId: string,
	inputValues: Record<string, unknown>,
	documentIds?: string[]
): Promise<string> {
	const payload = JSON.stringify({ promptId, inputValues, documentIds: documentIds ?? [] });
	const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(payload));
	return Array.from(new Uint8Array(buf))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}

// ---------------------------------------------------------------------------
// Submit + subscribe
// ---------------------------------------------------------------------------

export async function submitExecution(
	input: SubmitExecutionInput,
	token: string
): Promise<ExecutionHandle> {
	if (!token) {
		throw new AIError('Authentication required', 'AUTH_REQUIRED');
	}

	const executionId =
		input.executionId ??
		(await calculateExecutionId(input.promptId, input.inputValues, input.documentIds));

	// Check cache
	const cached = getCachedResult(executionId);
	if (cached !== undefined) {
		log.info('Cache hit for execution', executionId);
		return createCachedHandle(cached);
	}

	// Submit via AppSync
	const variables = {
		input: {
			projectId: input.projectId,
			promptId: input.promptId,
			executionId,
			inputValues: JSON.stringify(input.inputValues),
			...(input.documentIds?.length ? { documentIds: input.documentIds } : {}),
			...(input.topK != null ? { topK: input.topK } : {}),
			...(input.priority ? { priority: input.priority } : {})
		}
	};

	log.info('Submitting AI query execution', { executionId, promptId: input.promptId });

	const data = await gql<{ submitAIQuery: AiQueryExecution }>(
		M_SUBMIT_AI_QUERY,
		variables,
		token
	);

	const initial = data.submitAIQuery;
	if (!initial?.id) {
		throw new AIError('submitAIQuery returned no execution', 'SUBMIT_FAILED');
	}

	return createLiveHandle(initial, token);
}

// ---------------------------------------------------------------------------
// Streaming execution (SvelteKit /api/ai-stream SSE) with AppSync fallback
// ---------------------------------------------------------------------------

/**
 * Run an AI query with token streaming via same-origin POST /api/ai-stream.
 * Falls back to {@link submitExecution} when the endpoint is unavailable or returns non-SSE.
 */
export async function submitStreamingExecution(
	input: SubmitExecutionInput,
	token: string,
	onChunk: (text: string) => void = () => {}
): Promise<ExecutionHandle> {
	if (!token) {
		throw new AIError('Authentication required', 'AUTH_REQUIRED');
	}

	const executionId =
		input.executionId ??
		(await calculateExecutionId(input.promptId, input.inputValues, input.documentIds));

	const cached = getCachedResult(executionId);
	if (cached !== undefined) {
		log.info('Cache hit for execution (streaming path)', executionId);
		return createCachedHandle(cached);
	}

	const ac = new AbortController();

	try {
		const response = await fetch('/api/ai-stream', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				projectId: input.projectId,
				promptId: input.promptId,
				executionId,
				inputValues: input.inputValues,
				...(input.documentIds?.length ? { documentIds: input.documentIds } : {}),
				...(input.topK != null ? { topK: input.topK } : {}),
				...(input.topKPerNs != null ? { topKPerNs: input.topKPerNs } : {}),
				...(input.priority ? { priority: input.priority } : {}),
				...(input.googleSearchEnabled != null && { googleSearchEnabled: input.googleSearchEnabled })
			}),
			signal: ac.signal
		});

		const contentType = response.headers.get('Content-Type') ?? '';
		if (!response.ok || !response.body || !contentType.includes('text/event-stream')) {
			log.info('Streaming unavailable, using AppSync path', {
				status: response.status,
				contentType
			});
			return submitExecution(input, token);
		}

		const executionStore = writable<AiQueryExecution | null>(null);
		const statusStore = writable<ExecutionStatus | null>('PROCESSING' as ExecutionStatus);
		const { promise: resultPromise, resolve: resolveResult } = withResolvers<string | null>();

		let timeoutId: ReturnType<typeof setTimeout> | null = null;
		let destroyed = false;
		let recordId: string | null = null;
		let streamSettled = false;

		function finishStreamResult(value: string | null) {
			if (streamSettled) return;
			streamSettled = true;
			resolveResult(value);
		}

		function resetTimeout() {
			if (timeoutId) clearTimeout(timeoutId);
			timeoutId = setTimeout(() => {
				log.warn('Streaming execution timed out:', executionId);
				ac.abort();
				finishStreamResult(null);
				cleanup();
			}, DEFAULT_TIMEOUT_MS);
		}

		function scheduleCleanup() {
			setTimeout(() => cleanup(), 1000);
		}

		function cleanup() {
			if (destroyed) return;
			destroyed = true;
			if (timeoutId) clearTimeout(timeoutId);
			ac.abort();
		}

		const reader = response.body.getReader();
		const decoder = new TextDecoder();
		let buffer = '';
		let fullText = '';

		resetTimeout();

		void (async () => {
			try {
				while (true) {
					const { done, value } = await reader.read();
					if (done) break;
					buffer += decoder.decode(value, { stream: true });
					const lines = buffer.split('\n');
					buffer = lines.pop() ?? '';
					for (const line of lines) {
						const trimmed = line.trim();
						if (!trimmed.startsWith('data:')) continue;
						const payload = trimmed.slice(5).trimStart();
						let evt: {
							type?: string;
							text?: string;
							id?: string;
							executionId?: string;
							promptTokenCount?: number;
							candidatesTokenCount?: number;
							totalTokenCount?: number;
						};
						try {
							evt = JSON.parse(payload) as typeof evt;
						} catch {
							continue;
						}
						const type = evt.type;
						if (type === 'started' && evt.id) {
							recordId = evt.id;
							executionStore.set({
								id: evt.id,
								executionId: evt.executionId ?? executionId,
								status: 'PROCESSING',
								promptId: input.promptId,
								projectId: input.projectId
							} as AiQueryExecution);
						} else if (type === 'chunk' && typeof evt.text === 'string') {
							fullText += evt.text;
							onChunk(evt.text);
							executionStore.update((cur) => {
								const base =
									cur ??
									({
										id: recordId ?? '',
										executionId,
										promptId: input.promptId,
										projectId: input.projectId,
										status: 'PROCESSING'
									} as AiQueryExecution);
								return { ...base, rawOutput: fullText, status: 'PROCESSING' as const };
							});
							resetTimeout();
						} else if (type === 'meta') {
							executionStore.update((cur) =>
								cur
									? {
											...cur,
											...(evt.promptTokenCount != null && { promptTokenCount: evt.promptTokenCount }),
											...(evt.candidatesTokenCount != null && {
												candidatesTokenCount: evt.candidatesTokenCount
											}),
											...(evt.totalTokenCount != null && { totalTokenCount: evt.totalTokenCount })
										}
									: cur
							);
						} else if (type === 'done') {
							if (evt.id) recordId = evt.id;
							statusStore.set('SUCCESS' as ExecutionStatus);
							setCachedResult(executionId, fullText);
							executionStore.update((cur) => {
								const base =
									cur ??
									({
										id: recordId ?? evt.id,
										executionId: evt.executionId ?? executionId,
										promptId: input.promptId,
										projectId: input.projectId
									} as AiQueryExecution);
								return { ...base, status: 'SUCCESS' as const, rawOutput: fullText };
							});
							finishStreamResult(fullText);
							scheduleCleanup();
						} else if (type === 'error') {
							statusStore.set('ERROR' as ExecutionStatus);
							finishStreamResult(null);
							scheduleCleanup();
						}
					}
				}
				if (!streamSettled) {
					finishStreamResult(fullText.length ? fullText : null);
				}
			} catch (err) {
				if ((err as Error)?.name === 'AbortError') {
					finishStreamResult(null);
				} else {
					log.error('Streaming read error:', err);
					finishStreamResult(null);
				}
			} finally {
				if (timeoutId) clearTimeout(timeoutId);
			}
		})();

		return {
			execution: executionStore as Readable<AiQueryExecution | null>,
			status: statusStore as Readable<ExecutionStatus | null>,
			result: resultPromise,
			cancel: () => {
				if (recordId && token) {
					gql(M_UPDATE_AI_QUERY_EXECUTION, {
						id: recordId,
						input: { status: 'CANCELLED', statusMessage: 'Cancelled by user' }
					}, token).catch((err) => {
						log.error('Failed to cancel streaming execution:', err);
					});
				}
				ac.abort();
			},
			destroy: () => cleanup()
		};
	} catch (err) {
		if ((err as Error)?.name === 'AbortError') {
			const exStore = writable<AiQueryExecution | null>(null);
			const stStore = writable<ExecutionStatus | null>(null);
			return {
				execution: exStore as Readable<AiQueryExecution | null>,
				status: stStore as Readable<ExecutionStatus | null>,
				result: Promise.resolve(null),
				cancel: () => {},
				destroy: () => ac.abort()
			};
		}
		log.warn('Streaming request failed, using AppSync path:', err);
		return submitExecution(input, token);
	}
}

// ---------------------------------------------------------------------------
// Handle factories
// ---------------------------------------------------------------------------

function createCachedHandle(rawOutput: string | null): ExecutionHandle {
	const executionStore = writable<AiQueryExecution | null>(null);
	const statusStore = writable<ExecutionStatus | null>('SUCCESS' as ExecutionStatus);

	return {
		execution: executionStore as Readable<AiQueryExecution | null>,
		status: statusStore as Readable<ExecutionStatus | null>,
		result: Promise.resolve(rawOutput),
		cancel: () => {},
		destroy: () => {}
	};
}

function createLiveHandle(initial: AiQueryExecution, token: string): ExecutionHandle {
	const executionStore = writable<AiQueryExecution | null>(initial);
	const statusStore = writable<ExecutionStatus | null>(initial.status);

	let spec: SubscriptionSpec<AiQueryExecution> | null = null;
	let timeoutId: ReturnType<typeof setTimeout> | null = null;
	let destroyed = false;

	const { promise: resultPromise, resolve: resolveResult } = withResolvers<string | null>();

	// If already terminal, resolve immediately
	if (TERMINAL_STATUSES.has(initial.status)) {
		const out = initial.status === 'SUCCESS' ? (initial.rawOutput ?? null) : null;
		resolveResult(out);
		if (initial.status === 'SUCCESS' && initial.rawOutput !== undefined) {
			setCachedResult(initial.executionId, initial.rawOutput ?? null);
		}
	} else {
		// Subscribe for updates
		spec = {
			query: S_ON_UPDATE_AI_QUERY_EXECUTION,
			variables: { id: initial.id },
			select: (payload: unknown): AiQueryExecution | undefined => {
				const d = payload as Record<string, unknown>;
				const update =
					(d?.onUpdateAIQueryExecution as AiQueryExecution) ??
					((d?.data as Record<string, unknown>)?.onUpdateAIQueryExecution as AiQueryExecution) ??
					(d as AiQueryExecution);
				return update?.id ? update : undefined;
			},
			next: (update: AiQueryExecution) => {
				if (destroyed) return;
				executionStore.set(update);
				statusStore.set(update.status);

				if (TERMINAL_STATUSES.has(update.status)) {
					const out = update.status === 'SUCCESS' ? (update.rawOutput ?? null) : null;
					resolveResult(out);
					if (update.status === 'SUCCESS') {
						setCachedResult(update.executionId, update.rawOutput ?? null);
					}
					scheduleCleanup();
				} else {
					resetTimeout();
				}
			},
			error: (err: unknown) => {
				log.error('Subscription error:', err);
				if (!destroyed) {
					reconnect();
				}
			}
		};

		startSubscription();
		resetTimeout();
	}

	function startSubscription() {
		if (spec && !destroyed) {
			addSubscription(token, spec).catch((err) => {
				log.error('Failed to add subscription:', err);
			});
		}
	}

	function reconnect() {
		if (destroyed || !spec) return;
		log.info('Reconnecting subscription for', initial.id);
		removeSubscription(spec);
		setTimeout(() => startSubscription(), 1000);
	}

	function resetTimeout() {
		if (timeoutId) clearTimeout(timeoutId);
		timeoutId = setTimeout(() => {
			log.warn('Execution timed out:', initial.id);
			resolveResult(null);
			cleanup();
		}, DEFAULT_TIMEOUT_MS);
	}

	function scheduleCleanup() {
		setTimeout(() => cleanup(), 1000);
	}

	function cleanup() {
		if (destroyed) return;
		destroyed = true;
		if (timeoutId) clearTimeout(timeoutId);
		if (spec) removeSubscription(spec);
	}

	return {
		execution: executionStore as Readable<AiQueryExecution | null>,
		status: statusStore as Readable<ExecutionStatus | null>,
		result: resultPromise,
		cancel: () => {
			if (destroyed || TERMINAL_STATUSES.has(initial.status)) return;
			gql(M_UPDATE_AI_QUERY_EXECUTION, {
				id: initial.id,
				input: { status: 'CANCELLED', statusMessage: 'Cancelled by user' }
			}, token).catch((err) => {
				log.error('Failed to cancel execution:', err);
			});
		},
		destroy: () => cleanup()
	};
}

// ---------------------------------------------------------------------------
// Polyfill-safe Promise.withResolvers
// ---------------------------------------------------------------------------

function withResolvers<T>(): {
	promise: Promise<T>;
	resolve: (value: T) => void;
	reject: (reason?: unknown) => void;
} {
	let resolve!: (value: T) => void;
	let reject!: (reason?: unknown) => void;
	const promise = new Promise<T>((res, rej) => {
		resolve = res;
		reject = rej;
	});
	return { promise, resolve, reject };
}
