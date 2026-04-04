import { PUBLIC_GRAPHQL_HTTP_ENDPOINT } from '$env/static/public';
import type { DashboardLayout } from '@stratiqai/types-simple';
import {
	Q_LIST_DASHBOARD_LAYOUTS,
	M_CREATE_DASHBOARD_LAYOUT,
	M_UPDATE_DASHBOARD_LAYOUT,
	S_ON_CREATE_DASHBOARD_LAYOUT,
	S_ON_UPDATE_DASHBOARD_LAYOUT
} from '@stratiqai/types-simple';
import {
	getAppSyncWsClient,
	initAppSyncWsClient,
	destroyAppSyncWsClient,
	type AppSyncWsClient
} from '../wsClient';
import { GraphQLQueryClient } from '$lib/services/realtime/store/GraphQLQueryClient';

export type DashboardSyncManagerOptions = {
	idToken: string;
	projectId: string;
};

type ManagerStatus = 'inactive' | 'initializing' | 'ready' | 'error';

/**
 * Manages a single DashboardLayout entity per project.
 *
 * Unlike ProjectSyncManager (which syncs a list of entities to ValidatedTopicStore),
 * this manages a singleton-per-project that feeds directly into DashboardStore.
 */
export class DashboardSyncManager {
	private queryClient: GraphQLQueryClient | null = null;
	private subscriptionClient: AppSyncWsClient | null = null;
	private ownsWsClient = false;

	private _status: ManagerStatus = 'inactive';
	private _error: string | null = null;
	private initializationPromise: Promise<void> | null = null;

	private projectId: string | null = null;
	private layoutId: string | null = null;
	private updateSubHandle: { id: string; unsubscribe(): void } | null = null;
	private createSubHandle: { id: string; unsubscribe(): void } | null = null;

	private onRemoteUpdate: ((layout: DashboardLayout) => void) | null = null;

	private constructor() {}

	static createInactive(): DashboardSyncManager {
		return new DashboardSyncManager();
	}

	static async create(options: DashboardSyncManagerOptions): Promise<DashboardSyncManager> {
		const manager = new DashboardSyncManager();
		await manager.initialize(options);
		return manager;
	}

	async initialize({ idToken, projectId }: DashboardSyncManagerOptions): Promise<void> {
		if (this.initializationPromise) return this.initializationPromise;
		if (this._status === 'ready') this.cleanup();

		this._status = 'initializing';
		this.projectId = projectId;

		this.initializationPromise = (async () => {
			try {
				if (!idToken) throw new Error('DashboardSyncManager requires an idToken.');

				this.queryClient = new GraphQLQueryClient(idToken);

				const existingClient = getAppSyncWsClient();
				this.ownsWsClient = !existingClient;
				this.subscriptionClient =
					existingClient ??
					initAppSyncWsClient({
						graphqlHttpUrl: PUBLIC_GRAPHQL_HTTP_ENDPOINT,
						auth: { mode: 'cognito', idToken }
					});

				await this.subscriptionClient.ready();
				this._status = 'ready';
			} catch (err: unknown) {
				const msg = err instanceof Error ? err.message : 'Failed to initialize DashboardSyncManager';
				this._error = msg;
				this._status = 'error';
				throw err instanceof Error ? err : new Error(msg);
			}
		})();

		try {
			await this.initializationPromise;
		} finally {
			this.initializationPromise = null;
		}
	}

	async loadLayout(): Promise<DashboardLayout | null> {
		this.#ensureReady();

		const result = await this.queryClient!.query<{
			listDashboardLayouts: { items: DashboardLayout[]; nextToken: string | null };
		}>(Q_LIST_DASHBOARD_LAYOUTS, { parentId: this.projectId, limit: 1 });

		const items = result?.listDashboardLayouts?.items;
		if (items && items.length > 0) {
			this.layoutId = items[0].id;
			return items[0];
		}
		return null;
	}

	/**
	 * Create a layout for this project, but only if one does not already exist.
	 * If a layout is found, update it with the supplied state instead.
	 */
	async createLayout(state: string, version: string): Promise<DashboardLayout> {
		this.#ensureReady();

		const existing = await this.loadLayout();
		if (existing) {
			console.info('[DashboardSyncManager] Layout already exists for project — updating instead of creating.');
			this.layoutId = existing.id;
			const updated = await this.queryClient!.query<{
				updateDashboardLayout: DashboardLayout;
			}>(M_UPDATE_DASHBOARD_LAYOUT, {
				key: { id: existing.id, parentId: this.projectId },
				input: { state, version }
			});
			return updated?.updateDashboardLayout ?? existing;
		}

		const result = await this.queryClient!.query<{
			createDashboardLayout: DashboardLayout;
		}>(M_CREATE_DASHBOARD_LAYOUT, {
			input: { parentId: this.projectId, state, version }
		});

		const layout = result?.createDashboardLayout;
		if (layout) this.layoutId = layout.id;
		return layout;
	}

	async updateLayout(state: string, version: string): Promise<DashboardLayout | null> {
		this.#ensureReady();
		if (!this.layoutId) {
			const existing = await this.loadLayout();
			if (existing) {
				this.layoutId = existing.id;
			} else {
				console.info('[DashboardSyncManager] No layout exists — creating one.');
				return this.createLayout(state, version);
			}
		}

		const result = await this.queryClient!.query<{
			updateDashboardLayout: DashboardLayout;
		}>(M_UPDATE_DASHBOARD_LAYOUT, {
			key: { id: this.layoutId, parentId: this.projectId },
			input: { state, version }
		});

		return result?.updateDashboardLayout ?? null;
	}

	/**
	 * Subscribe to remote updates for the current layout.
	 * Call after loadLayout/createLayout sets layoutId.
	 */
	setupUpdateSubscription(onUpdate: (layout: DashboardLayout) => void): void {
		if (!this.subscriptionClient || !this.layoutId) return;

		this.onRemoteUpdate = onUpdate;

		this.updateSubHandle?.unsubscribe();
		this.updateSubHandle = this.subscriptionClient.subscribe<{ onUpdateDashboardLayout: DashboardLayout }>({
			query: S_ON_UPDATE_DASHBOARD_LAYOUT,
			variables: { id: this.layoutId },
			next: (data) => {
				const layout = data?.onUpdateDashboardLayout;
				if (layout && this.onRemoteUpdate) {
					this.onRemoteUpdate(layout);
				}
			},
			error: (err) => {
				console.error('[DashboardSyncManager] Update subscription error:', err);
			}
		});
	}

	/**
	 * Subscribe to new layout creations for the current project.
	 * Useful during migration when another tab might create the layout.
	 */
	setupCreateSubscription(onCreate: (layout: DashboardLayout) => void): void {
		if (!this.subscriptionClient || !this.projectId) return;

		this.createSubHandle?.unsubscribe();
		this.createSubHandle = this.subscriptionClient.subscribe<{ onCreateDashboardLayout: DashboardLayout }>({
			query: S_ON_CREATE_DASHBOARD_LAYOUT,
			variables: { parentId: this.projectId },
			next: (data) => {
				const layout = data?.onCreateDashboardLayout;
				if (layout) {
					this.layoutId = layout.id;
					onCreate(layout);
				}
			},
			error: (err) => {
				console.error('[DashboardSyncManager] Create subscription error:', err);
			}
		});
	}

	cleanup(): void {
		this.updateSubHandle?.unsubscribe();
		this.updateSubHandle = null;
		this.createSubHandle?.unsubscribe();
		this.createSubHandle = null;

		if (this.ownsWsClient) destroyAppSyncWsClient();

		this.queryClient = null;
		this.subscriptionClient = null;
		this.ownsWsClient = false;
		this.onRemoteUpdate = null;
		this.layoutId = null;
		this.projectId = null;
		this._status = 'inactive';
		this._error = null;
		this.initializationPromise = null;
	}

	get status(): ManagerStatus {
		return this._status;
	}

	get isReady(): boolean {
		return this._status === 'ready';
	}

	get lastError(): string | null {
		return this._error;
	}

	get currentLayoutId(): string | null {
		return this.layoutId;
	}

	set currentLayoutId(id: string | null) {
		this.layoutId = id;
	}

	#ensureReady() {
		if (this._status !== 'ready' || !this.queryClient) {
			throw new Error(`DashboardSyncManager is not ready. Current status: ${this._status}`);
		}
	}
}
