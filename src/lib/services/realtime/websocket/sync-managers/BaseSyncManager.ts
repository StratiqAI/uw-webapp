/**
 * BaseSyncManager
 *
 * Abstract base class that extracts the repeated lifecycle boilerplate
 * from all sync managers: WS client acquisition, status tracking,
 * loading/error state, initialization dedup, cleanup, and
 * reconnect-triggered refetch for zero-stale-data guarantees.
 *
 * Subclasses implement three hooks:
 *   doInitialize(options)  — domain-specific setup (queries, schemas, subs)
 *   doCleanup()            — domain-specific teardown
 *   doRefetch()            — re-run HTTP queries after reconnect
 */

import {
	destroyAppSyncWsClient,
	type AppSyncWsClient
} from '../wsClient';
import { ensureConnection } from '$lib/stores/appSyncClientStore';
import { GraphQLQueryClient } from '$lib/services/realtime/store/GraphQLQueryClient';
import { createLogger } from '$lib/utils/logger';

const log = createLogger('sync');

export type ManagerStatus = 'inactive' | 'initializing' | 'ready' | 'error' | 'reconnecting';

export interface BaseSyncManagerOptions {
	idToken: string;
	[key: string]: any;
}

export abstract class BaseSyncManager {
	protected queryClient: GraphQLQueryClient | null = null;
	protected subscriptionClient: AppSyncWsClient | null = null;
	protected ownsWsClient = false;

	private _status: ManagerStatus = 'inactive';
	private _loading = false;
	private _error: string | null = null;
	private initializationPromise: Promise<void> | null = null;
	private reconnectCleanup: (() => void) | null = null;

	protected abstract get managerName(): string;

	/**
	 * Domain-specific initialization: create EntitySyncManagers, load data,
	 * register schemas, set up subscriptions, etc.
	 * queryClient and subscriptionClient are guaranteed non-null when called.
	 */
	protected abstract doInitialize(options: BaseSyncManagerOptions): Promise<void>;

	/**
	 * Domain-specific cleanup: remove subscriptions, null out references.
	 * Base class handles WS client, queryClient, and status reset.
	 */
	protected abstract doCleanup(): void;

	/**
	 * Re-run HTTP queries to refresh data after a reconnect.
	 * Called automatically when the WS client reconnects.
	 */
	protected abstract doRefetch(): Promise<void>;

	// ── Public lifecycle ──────────────────────────────────────────────

	async initialize(options: BaseSyncManagerOptions): Promise<void> {
		if (this.initializationPromise) {
			return this.initializationPromise;
		}

		if (this._status === 'ready') {
			this.cleanup();
		}

		this._status = 'initializing';

		this.initializationPromise = this.runWithStatus(async () => {
			const { idToken } = options;
			if (!idToken) {
				throw new Error(`${this.managerName} requires an idToken to initialize.`);
			}

			this.queryClient = new GraphQLQueryClient(idToken);
			this.subscriptionClient = await this.initWsClient(idToken);

			// #region agent log
			console.warn('[DEBUG-aba2b8] H-HANG after initWsClient resolved', { managerName: this.managerName, hasClient: !!this.subscriptionClient });
			// #endregion

			await this.doInitialize(options);

			this._status = 'ready';
		}, `Failed to initialize ${this.managerName}`).finally(() => {
			this.initializationPromise = null;
			if (this._error) {
				this._status = 'error';
			}
		});

		return this.initializationPromise;
	}

	cleanup(): void {
		this.doCleanup();

		if (this.reconnectCleanup) {
			this.reconnectCleanup();
			this.reconnectCleanup = null;
		}

		if (this.ownsWsClient) {
			destroyAppSyncWsClient();
		}

		this.queryClient = null;
		this.subscriptionClient = null;
		this.ownsWsClient = false;
		this._status = 'inactive';
		this._loading = false;
		this._error = null;
		this.initializationPromise = null;
	}

	// ── Status accessors ──────────────────────────────────────────────

	get status(): ManagerStatus {
		return this._status;
	}

	get isReady(): boolean {
		return this._status === 'ready';
	}

	get isLoading(): boolean {
		return this._loading;
	}

	get lastError(): string | null {
		return this._error;
	}

	// ── Protected helpers ─────────────────────────────────────────────

	protected ensureReady(): void {
		if (this._status !== 'ready') {
			throw new Error(`${this.managerName} is not ready. Current status: ${this._status}`);
		}
	}

	protected async runWithStatus<T>(action: () => Promise<T>, fallbackMessage: string): Promise<T> {
		this._loading = true;
		this._error = null;
		try {
			return await action();
		} catch (err: unknown) {
			const errorMessage = err instanceof Error ? err.message : fallbackMessage;
			this._error = errorMessage;
			throw err instanceof Error ? err : new Error(errorMessage);
		} finally {
			this._loading = false;
		}
	}

	/**
	 * Acquires (or reuses) the singleton WS client via the shared
	 * appSyncClientStore, which coordinates token tracking to avoid
	 * race conditions where a stale reference is destroyed.
	 */
	protected async initWsClient(idToken: string): Promise<AppSyncWsClient> {
		const client = await ensureConnection(idToken);
		this.ownsWsClient = false;

		this.reconnectCleanup = client.registerOnReconnect(() => {
			this.handleReconnect();
		});

		return client;
	}

	private async handleReconnect(): Promise<void> {
		if (this._status !== 'ready' && this._status !== 'reconnecting') return;

		const previousStatus = this._status;
		this._status = 'reconnecting';
		log.info(`[${this.managerName}] Reconnect detected, refetching data…`);

		try {
			await this.doRefetch();
			this._status = 'ready';
			this._error = null;
			log.info(`[${this.managerName}] Refetch after reconnect complete.`);
		} catch (err) {
			log.error(`[${this.managerName}] Refetch after reconnect failed:`, err);
			this._error = err instanceof Error ? err.message : 'Refetch failed';
			this._status = previousStatus === 'ready' ? 'ready' : 'error';
		}
	}
}
