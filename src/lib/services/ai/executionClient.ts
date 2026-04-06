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
