import { PUBLIC_GRAPHQL_HTTP_ENDPOINT } from '$env/static/public';
import { browser } from '$app/environment';
import type { Project } from '@stratiqai/types-simple';
import {
	Q_GET_PROJECT,
	Q_LIST_PROJECTS,
	S_ON_CREATE_PROJECT,
	S_ON_DELETE_PROJECT,
	S_ON_UPDATE_PROJECT
} from '@stratiqai/types-simple';
import { validatedTopicStore } from '$lib/stores/validatedTopicStore';
import {
	getAppSyncWsClient,
	initAppSyncWsClient,
	destroyAppSyncWsClient,
	type AppSyncWsClient
} from '$lib/realtime/websocket/wsClient';
import { GraphQLQueryClient } from '$lib/realtime/store/GraphQLQueryClient';
import { EntitySyncManager } from '$lib/realtime/store/EntitySyncManager';
import type { EntitySyncOptions, EntitySyncResult } from '$lib/realtime/store/EntitySyncConfig';
import { createProjectSyncConfig } from '$lib/realtime/store/EntitySyncHelpers';
import { toTopicPath } from '$lib/realtime/store/TopicMapper';

// Re-export the specific store used by this manager
export const store = validatedTopicStore;

// Expose dumpStore function to browser console for debugging
if (browser && typeof window !== 'undefined') {
	(window as any).dumpStore = () => {
		console.log('ValidatedTopicStore contents:', store.toJSON());
		return store.toJSON();
	};
}

/**
 * Configuration for synchronizing Project entities.
 */
const projectSyncConfig = createProjectSyncConfig(
	Q_LIST_PROJECTS,
	Q_GET_PROJECT,
	S_ON_UPDATE_PROJECT,
	S_ON_DELETE_PROJECT,
	S_ON_CREATE_PROJECT
);

export type ProjectManagerOptions = {
	/** The user's authentication token required for GraphQL requests. */
	idToken?: string;
	/** Optional list of projects to seed the store with immediately. */
	initialItems?: Project[];
	/** Whether to automatically setup GraphQL subscriptions for the initialItems. Defaults to false. */
	setupSubscriptions?: boolean;
	/** Whether to clear existing Project data from the store on initialization. Defaults to false. */
	clearExisting?: boolean;
};

type ManagerStatus = 'inactive' | 'initializing' | 'ready' | 'error';

export class ProjectSyncManager {
	// --- Internal Clients ---
	private queryClient: GraphQLQueryClient | null = null;
	private subscriptionClient: AppSyncWsClient | null = null;
	private entitySyncManager: EntitySyncManager<Project> | null = null;
	private ownsWsClient = false;

	// --- Operational State ---
	private _status: ManagerStatus = 'inactive';
	private _loading = false;
	private _error: string | null = null;
	private initializationPromise: Promise<void> | null = null;

	private constructor() {}

	/**
	 * Creates an instance of the manager without initializing it.
	 * Call `initialize()` later to set it up.
	 */
	static createInactive(): ProjectSyncManager {
		return new ProjectSyncManager();
	}

	/**
	 * Creates and initializes an instance of the manager.
	 * @param options Configuration options for initialization.
	 */
	static async create(options: ProjectManagerOptions): Promise<ProjectSyncManager> {
		const manager = new ProjectSyncManager();
		await manager.initialize(options);
		return manager;
	}

	/**
	 * Sets up the GraphQL clients, establishes WebSocket connections, and prepares the entity sync manager.
	 * If already initializing, returns the existing promise.
	 * If already ready, it cleans up the previous session before re-initializing.
	 */
	async initialize({
		idToken,
		initialItems = [],
		setupSubscriptions = false,
		clearExisting = false
	}: ProjectManagerOptions): Promise<void> {
		// Prevent concurrent initializations
		if (this.initializationPromise) {
			return this.initializationPromise;
		}

		if (this._status === 'ready') {
			this.cleanup();
		}

		this._status = 'initializing';

		this.initializationPromise = this.#runWithStatus(async () => {
			if (!idToken) {
				throw new Error('ProjectSyncManager requires an idToken to initialize.');
			}

			const queryClient = new GraphQLQueryClient(idToken);

			// Check if a global WS client exists, otherwise create and own a new one.
			const existingClient = getAppSyncWsClient();
			const ownsWsClient = !existingClient;
			const subscriptionClient =
				existingClient ??
				initAppSyncWsClient({
					graphqlHttpUrl: PUBLIC_GRAPHQL_HTTP_ENDPOINT,
					auth: { mode: 'cognito', idToken }
				});

			// Ensure the socket is ready before proceeding
			await subscriptionClient.ready();

			const entitySyncManager = new EntitySyncManager<Project>({
				queryClient,
				subscriptionClient,
				store,
				config: projectSyncConfig
			});

			// Assign references only after successful creation
			this.queryClient = queryClient;
			this.subscriptionClient = subscriptionClient;
			this.entitySyncManager = entitySyncManager;
			this.ownsWsClient = ownsWsClient;

			if (clearExisting) {
				store.clearAllAt(projectSyncConfig.entityType);
			}

			// Seed initial data into the store
			if (initialItems.length > 0) {
				for (const item of initialItems) {
					const id = projectSyncConfig.getEntityId(item);
					if (id) {
						store.publish(toTopicPath(projectSyncConfig.entityType, id), item);
					}
				}

				if (setupSubscriptions) {
					entitySyncManager.setupCreateSubscription();
					entitySyncManager.setupSubscriptionsForEntities(initialItems);
				}
			} else if (setupSubscriptions) {
				entitySyncManager.setupCreateSubscription();
			}

			this._status = 'ready';
		}, 'Failed to initialize project sync').finally(() => {
			this.initializationPromise = null;
			if (this._error) {
				this._status = 'error';
			}
		});

		return this.initializationPromise;
	}

	/**
	 * Fetches a list of projects from the API and syncs them to the store.
	 * @throws Error if the manager is not ready.
	 */
	async syncList(options?: EntitySyncOptions): Promise<EntitySyncResult<Project>> {
		this.#ensureReady();
		return this.#runWithStatus(
			() => this.entitySyncManager!.syncList(options),
			'Failed to sync project list'
		);
	}

	/**
	 * Fetches a single project by ID from the API and syncs it to the store.
	 * @throws Error if the manager is not ready.
	 */
	async syncOne(id: string, options?: EntitySyncOptions): Promise<Project | null> {
		this.#ensureReady();
		return this.#runWithStatus(
			() => this.entitySyncManager!.syncOne(id, options),
			`Failed to sync project ${id}`
		);
	}

	/**
	 * Cleans up resources, unsubscribes from real-time updates, and destroys clients if they are owned by this manager.
	 */
	cleanup(): void {
		this.entitySyncManager?.cleanup();

		if (this.ownsWsClient) {
			destroyAppSyncWsClient();
		}

		this.queryClient = null;
		this.subscriptionClient = null;
		this.entitySyncManager = null;
		this.ownsWsClient = false;
		this._status = 'inactive';
		this._loading = false;
		this._error = null;
		this.initializationPromise = null;
	}

	/** The underlying Svelte store used for data persistence. */
	get store() {
		return store;
	}

	/** The current operational status of the manager. */
	get status(): ManagerStatus {
		return this._status;
	}

	/** Returns true if the manager is successfully initialized and ready for operations. */
	get isReady(): boolean {
		return this._status === 'ready';
	}

	/** Returns true if an async operation (initialize, syncList, syncOne) is currently in progress. */
	get isLoading(): boolean {
		return this._loading;
	}

	/** Returns the error message from the last failed operation, if any. */
	get lastError(): string | null {
		return this._error;
	}

	#ensureReady() {
		if (this._status !== 'ready' || !this.entitySyncManager) {
			throw new Error(`ProjectSyncManager is not ready. Current status: ${this._status}`);
		}
	}

	/**
	 * Helper to wrap async operations with loading and error state management.
	 */
	async #runWithStatus<T>(action: () => Promise<T>, fallbackMessage: string): Promise<T> {
		this._loading = true;
		this._error = null;
		try {
			return await action();
		} catch (err: unknown) {
			const errorMessage = err instanceof Error ? err.message : fallbackMessage;
			this._error = errorMessage;
			// Re-throw so the caller knows it failed
			throw err instanceof Error ? err : new Error(errorMessage);
		} finally {
			this._loading = false;
		}
	}
}