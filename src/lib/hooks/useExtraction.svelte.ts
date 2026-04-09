/**
 * Svelte 5 rune hook for Extraction data.
 *
 * Fetches an Extraction by ID, subscribes for real-time updates,
 * and exposes the result as reactive state. Widgets use this to
 * bind directly to extraction data without VTS or structural hash matching.
 */

import {
	Q_GET_EXTRACTION,
	Q_LIST_EXTRACTIONS,
	S_ON_UPDATE_EXTRACTION,
	M_CREATE_EXTRACTION,
	M_RUN_EXTRACTION,
	M_UPDATE_EXTRACTION,
	M_DELETE_EXTRACTION,
} from '@stratiqai/types-simple';
import type { ExtractionStatus } from '@stratiqai/types-simple';
import { gql } from '$lib/services/realtime/graphql/requestHandler';
import { addSubscription, removeSubscription } from '$lib/stores/appSyncClientStore';
import type { SubscriptionSpec } from '$lib/services/realtime/websocket/types';
import { createLogger } from '$lib/utils/logger';

const log = createLogger('extraction');

export interface Extraction {
	id: string;
	projectId: string;
	tenantId: string;
	ownerId: string;
	name?: string;
	prompt: string;
	systemInstruction?: string;
	schema?: string;
	model: string;
	documentIds?: string[];
	topK?: number;
	topKPerNs?: number;
	promptId?: string;
	status: ExtractionStatus;
	statusMessage?: string;
	errorMessage?: string;
	errorCode?: string;
	result?: string;
	rawAnswer?: string;
	startedAt?: string;
	executedAt?: string;
	durationMs?: number;
	promptTokenCount?: number;
	candidatesTokenCount?: number;
	totalTokenCount?: number;
	createdAt?: string;
	updatedAt?: string;
}

const TERMINAL_STATUSES = new Set<string>(['SUCCESS', 'ERROR']);

/**
 * Reactive hook that fetches and subscribes to an Extraction.
 *
 * Usage in a Svelte component:
 * ```ts
 * const ext = useExtraction(() => widgetConfig.extractionId, () => token);
 * // ext.data - the Extraction record (reactive)
 * // ext.result - parsed JSON result (reactive)
 * // ext.loading / ext.error - status flags
 * ```
 */
export function useExtraction(
	extractionId: () => string | undefined,
	token: () => string
) {
	let data = $state<Extraction | null>(null);
	let loading = $state(false);
	let error = $state<string | null>(null);
	let currentSub: SubscriptionSpec<Extraction> | null = null;
	let currentId: string | undefined;

	const result = $derived.by(() => {
		if (!data?.result) return null;
		try {
			return JSON.parse(data.result);
		} catch {
			return null;
		}
	});

	const status = $derived(data?.status ?? null);
	const isRunning = $derived(data?.status === 'RUNNING' || data?.status === 'QUEUED');
	const isComplete = $derived(data?.status === 'SUCCESS');
	const hasError = $derived(data?.status === 'ERROR');

	$effect(() => {
		const id = extractionId();
		const tok = token();

		if (!id || !tok) {
			cleanup();
			data = null;
			return;
		}

		if (id !== currentId) {
			cleanup();
			currentId = id;
			fetchAndSubscribe(id, tok);
		}

		return () => cleanup();
	});

	async function fetchAndSubscribe(id: string, tok: string) {
		loading = true;
		error = null;

		try {
			const resp = await gql<{ getExtraction: Extraction }>(
				Q_GET_EXTRACTION,
				{ id },
				tok
			);
			if (currentId !== id) return;
			data = resp.getExtraction ?? null;

			if (data && !TERMINAL_STATUSES.has(data.status)) {
				subscribe(id, tok);
			}
		} catch (err) {
			if (currentId !== id) return;
			error = err instanceof Error ? err.message : String(err);
			log.error('Failed to fetch extraction', id, err);
		} finally {
			if (currentId === id) loading = false;
		}
	}

	function subscribe(id: string, tok: string) {
		const spec: SubscriptionSpec<Extraction> = {
			query: S_ON_UPDATE_EXTRACTION,
			variables: { id },
			select: (payload: unknown): Extraction | undefined => {
				const d = payload as Record<string, unknown>;
				const update =
					(d?.onUpdateExtraction as Extraction) ??
					((d?.data as Record<string, unknown>)?.onUpdateExtraction as Extraction) ??
					(d as Extraction);
				return update?.id ? update : undefined;
			},
			next: (update: Extraction) => {
				data = update;
				if (TERMINAL_STATUSES.has(update.status)) {
					cleanup();
				}
			},
			error: (err: unknown) => {
				log.error('Extraction subscription error:', err);
			},
		};

		currentSub = spec;
		addSubscription(tok, spec).catch((err) => {
			log.error('Failed to subscribe to extraction:', err);
		});
	}

	function cleanup() {
		if (currentSub) {
			removeSubscription(currentSub);
			currentSub = null;
		}
		currentId = undefined;
	}

	return {
		get data() { return data; },
		get result() { return result; },
		get status() { return status; },
		get loading() { return loading; },
		get error() { return error; },
		get isRunning() { return isRunning; },
		get isComplete() { return isComplete; },
		get hasError() { return hasError; },
	};
}

/**
 * Create a new Extraction and optionally run it immediately.
 */
export async function createExtraction(
	input: {
		projectId: string;
		prompt: string;
		name?: string;
		systemInstruction?: string;
		schema?: string;
		model?: string;
		documentIds?: string[];
		topK?: number;
		topKPerNs?: number;
		promptId?: string;
		runImmediately?: boolean;
	},
	token: string
): Promise<Extraction> {
	const resp = await gql<{ createExtraction: Extraction }>(
		M_CREATE_EXTRACTION,
		{ input },
		token
	);
	return resp.createExtraction;
}

/**
 * Submit an existing DRAFT extraction for processing.
 */
export async function runExtraction(
	id: string,
	token: string
): Promise<Extraction> {
	const resp = await gql<{ runExtraction: Extraction }>(
		M_RUN_EXTRACTION,
		{ id },
		token
	);
	return resp.runExtraction;
}

/**
 * List all extractions for a project.
 */
export async function listExtractions(
	projectId: string,
	token: string,
	limit?: number
): Promise<Extraction[]> {
	const resp = await gql<{ listExtractions: { items: Extraction[] } }>(
		Q_LIST_EXTRACTIONS,
		{ projectId, limit: limit ?? 50 },
		token
	);
	return resp.listExtractions?.items ?? [];
}

/**
 * Update an extraction's configuration or result.
 */
export async function updateExtraction(
	id: string,
	input: Partial<Omit<Extraction, 'id' | 'projectId' | 'tenantId' | 'ownerId'>>,
	token: string
): Promise<Extraction> {
	const resp = await gql<{ updateExtraction: Extraction }>(
		M_UPDATE_EXTRACTION,
		{ id, input },
		token
	);
	return resp.updateExtraction;
}

/**
 * Delete an extraction.
 */
export async function deleteExtraction(
	id: string,
	token: string
): Promise<void> {
	await gql(M_DELETE_EXTRACTION, { id }, token);
}
