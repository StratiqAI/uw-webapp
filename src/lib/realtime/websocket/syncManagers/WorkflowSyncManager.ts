import { PUBLIC_GRAPHQL_HTTP_ENDPOINT } from '$env/static/public';
import { browser } from '$app/environment';
import type { Workflow, WorkflowExecution, WorkflowNodeExecution } from '@agnathan/types-simple';
import {
	Q_GET_WORKFLOW,
	Q_LIST_WORKFLOWS,
	S_ON_CREATE_WORKFLOW,
	S_ON_UPDATE_WORKFLOW,
	S_ON_DELETE_WORKFLOW,
	Q_GET_WORKFLOW_EXECUTION,
	Q_LIST_WORKFLOW_EXECUTIONS,
	S_ON_CREATE_WORKFLOW_EXECUTION,
	S_ON_UPDATE_WORKFLOW_EXECUTION,
	S_ON_WORKFLOW_EXECUTION_STATUS_CHANGE,
	Q_GET_WORKFLOW_NODE_EXECUTION,
	Q_LIST_WORKFLOW_NODE_EXECUTIONS,
	S_ON_CREATE_WORKFLOW_NODE_EXECUTION,
	S_ON_UPDATE_WORKFLOW_NODE_EXECUTION,
	S_ON_WORKFLOW_NODE_EXECUTION_STATUS_CHANGE
} from '@agnathan/types-simple';
import { validatedTopicStore } from '$lib/stores/validatedTopicStore';
import {
	getAppSyncWsClient,
	initAppSyncWsClient,
	destroyAppSyncWsClient,
	type AppSyncWsClient
} from '../wsClient';
import type { SubscriptionSpec } from '../types';
import { GraphQLQueryClient } from '$lib/realtime/store/GraphQLQueryClient';
import { EntitySyncManager } from '$lib/realtime/store/EntitySyncManager';
import type { EntitySyncOptions, EntitySyncResult } from '$lib/realtime/store/EntitySyncConfig';
import { createWorkflowSyncConfig, createEntitySyncConfig } from '$lib/realtime/store/EntitySyncHelpers';
import { toTopicPath } from '$lib/realtime/store/TopicMapper';

// Re-export the specific store used by this manager
export const store = validatedTopicStore;

// Expose dumpStore function to browser console for debugging
if (browser && typeof window !== 'undefined') {
	(window as any).dumpWorkflowStore = () => {
		console.log('ValidatedTopicStore workflow contents:', store.toJSON());
		return store.toJSON();
	};
}

/**
 * Configuration for synchronizing Workflow entities.
 */
const workflowSyncConfig = {
	...createWorkflowSyncConfig(
		Q_LIST_WORKFLOWS,
		Q_GET_WORKFLOW,
		S_ON_UPDATE_WORKFLOW,
		S_ON_DELETE_WORKFLOW,
		S_ON_CREATE_WORKFLOW
	),
	buildCreateVariables: (options?: Record<string, any>) => ({
		parentId: options?.projectId || undefined
	})
};

/**
 * Configuration for synchronizing WorkflowExecution entities.
 */
const workflowExecutionSyncConfig = createEntitySyncConfig<WorkflowExecution>({
	entityType: 'workflowExecutions',
	listQuery: Q_LIST_WORKFLOW_EXECUTIONS,
	getQuery: Q_GET_WORKFLOW_EXECUTION,
	createSubscription: S_ON_CREATE_WORKFLOW_EXECUTION,
	updateSubscription: S_ON_UPDATE_WORKFLOW_EXECUTION,
	deleteSubscription: S_ON_UPDATE_WORKFLOW_EXECUTION, // WorkflowExecutions use update for status changes
	listResponsePath: 'listWorkflowExecutions.items',
	getResponsePath: 'getWorkflowExecution',
	createSubscriptionPath: 'onCreateWorkflowExecution',
	updateSubscriptionPath: 'onUpdateWorkflowExecution',
	deleteSubscriptionPath: 'onUpdateWorkflowExecution',
	buildListVariables: (options?: Record<string, any>) => ({
		// Use projectId as parentId when workflowId is not available (e.g., when saving a new workflow)
		parentId: options?.workflowId || options?.projectId,
		status: options?.status,
		limit: options?.limit,
		nextToken: options?.nextToken
	}),
	buildCreateVariables: (options?: Record<string, any>) => ({
		// onCreateWorkflowExecution(parentId: ID!) requires parentId (workflow ID)
		parentId: options?.workflowId ?? (options?.entity as { parentId?: string } | undefined)?.parentId
	}),
	buildUpdateVariables: (id: string) => ({ id })
});

/**
 * Configuration for synchronizing WorkflowNodeExecution entities.
 */
const workflowNodeExecutionSyncConfig = createEntitySyncConfig<WorkflowNodeExecution>({
	entityType: 'workflowNodeExecutions',
	listQuery: Q_LIST_WORKFLOW_NODE_EXECUTIONS,
	getQuery: Q_GET_WORKFLOW_NODE_EXECUTION,
	createSubscription: S_ON_CREATE_WORKFLOW_NODE_EXECUTION,
	updateSubscription: S_ON_UPDATE_WORKFLOW_NODE_EXECUTION,
	deleteSubscription: S_ON_UPDATE_WORKFLOW_NODE_EXECUTION, // WorkflowNodeExecutions use update for status changes
	listResponsePath: 'listWorkflowNodeExecutions.items',
	getResponsePath: 'getWorkflowNodeExecution',
	createSubscriptionPath: 'onCreateWorkflowNodeExecution',
	updateSubscriptionPath: 'onUpdateWorkflowNodeExecution',
	deleteSubscriptionPath: 'onUpdateWorkflowNodeExecution',
	buildListVariables: (options?: Record<string, any>) => ({
		parentId: options?.workflowExecutionId,
		status: options?.status,
		limit: options?.limit,
		nextToken: options?.nextToken
	}),
	buildCreateVariables: (options?: Record<string, any>) => ({
		// onCreateWorkflowNodeExecution(parentId: ID!) requires parentId (workflowExecution ID)
		parentId: options?.workflowExecutionId ?? (options?.entity as { parentId?: string } | undefined)?.parentId
	}),
	buildUpdateVariables: (id: string) => ({ id })
});

export type WorkflowManagerOptions = {
	/** The user's authentication token required for GraphQL requests. */
	idToken?: string;
	/** Optional list of workflows to seed the store with immediately. */
	initialWorkflows?: Workflow[];
	/** Whether to automatically setup GraphQL subscriptions for the initialWorkflows. Defaults to false. */
	setupSubscriptions?: boolean;
	/** Whether to clear existing Workflow data from the store on initialization. Defaults to false. */
	clearExisting?: boolean;
};

type ManagerStatus = 'inactive' | 'initializing' | 'ready' | 'error';

export type SubscriptionEvent = {
	id: string;
	timestamp: Date;
	entityType: 'workflow' | 'workflowExecution' | 'workflowNodeExecution';
	operation: 'create' | 'update' | 'delete' | 'statusChange';
	entityId: string;
	data: any;
	error?: string;
};

export class WorkflowSyncManager {
	// --- Internal Clients ---
	private queryClient: GraphQLQueryClient | null = null;
	private subscriptionClient: AppSyncWsClient | null = null;
	private workflowSyncManager: EntitySyncManager<Workflow> | null = null;
	private workflowExecutionSyncManager: EntitySyncManager<WorkflowExecution> | null = null;
	private workflowNodeExecutionSyncManager: EntitySyncManager<WorkflowNodeExecution> | null = null;
	private ownsWsClient = false;

	// --- Operational State ---
	private _status: ManagerStatus = 'inactive';
	private _loading = false;
	private _error: string | null = null;
	private initializationPromise: Promise<void> | null = null;

	// --- Subscription Events Tracking ---
	private _subscriptionEvents: SubscriptionEvent[] = [];
	private eventListeners: Set<(event: SubscriptionEvent) => void> = new Set();

	/** Tracks active WorkflowNodeExecution status-change subscriptions by workflowExecutionId. */
	private nodeExecutionSubscriptions: Map<string, SubscriptionSpec<any>> = new Map();

	private constructor() {}

	/**
	 * Creates an instance of the manager without initializing it.
	 * Call `initialize()` later to set it up.
	 */
	static createInactive(): WorkflowSyncManager {
		return new WorkflowSyncManager();
	}

	/**
	 * Creates and initializes an instance of the manager.
	 * @param options Configuration options for initialization.
	 */
	static async create(options: WorkflowManagerOptions): Promise<WorkflowSyncManager> {
		const manager = new WorkflowSyncManager();
		await manager.initialize(options);
		return manager;
	}

	/**
	 * Sets up the GraphQL clients, establishes WebSocket connections, and prepares the entity sync managers.
	 * If already initializing, returns the existing promise.
	 * If already ready, it cleans up the previous session before re-initializing.
	 */
	async initialize({
		idToken,
		initialWorkflows = [],
		setupSubscriptions = false,
		clearExisting = false
	}: WorkflowManagerOptions): Promise<void> {
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
				throw new Error('WorkflowSyncManager requires an idToken to initialize.');
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

			// Create sync managers for each entity type
			const workflowSyncManager = new EntitySyncManager<Workflow>({
				queryClient,
				subscriptionClient,
				store,
				config: {
					...workflowSyncConfig,
					onCreate: (entity) => this.#recordEvent('workflow', 'create', entity.id, entity),
					onUpdate: (entity) => this.#recordEvent('workflow', 'update', entity.id, entity),
					onDelete: (entity) => this.#recordEvent('workflow', 'delete', entity.id, entity),
					onSubscriptionError: (error, entityId, operation) =>
						this.#recordEvent('workflow', operation, entityId || 'unknown', null, error?.message || 'Unknown error')
				}
			});

			const workflowExecutionSyncManager = new EntitySyncManager<WorkflowExecution>({
				queryClient,
				subscriptionClient,
				store,
				config: {
					...workflowExecutionSyncConfig,
					onCreate: (entity) => this.#recordEvent('workflowExecution', 'create', entity.id, entity),
					onUpdate: (entity) => this.#recordEvent('workflowExecution', 'update', entity.id, entity),
					onDelete: (entity) => this.#recordEvent('workflowExecution', 'delete', entity.id, entity),
					onSubscriptionError: (error, entityId, operation) =>
						this.#recordEvent('workflowExecution', operation, entityId || 'unknown', null, error?.message || 'Unknown error')
				}
			});

			const workflowNodeExecutionSyncManager = new EntitySyncManager<WorkflowNodeExecution>({
				queryClient,
				subscriptionClient,
				store,
				config: {
					...workflowNodeExecutionSyncConfig,
					onCreate: (entity) => this.#recordEvent('workflowNodeExecution', 'create', entity.id, entity),
					onUpdate: (entity) => this.#recordEvent('workflowNodeExecution', 'update', entity.id, entity),
					onDelete: (entity) => this.#recordEvent('workflowNodeExecution', 'delete', entity.id, entity),
					onSubscriptionError: (error, entityId, operation) =>
						this.#recordEvent('workflowNodeExecution', operation, entityId || 'unknown', null, error?.message || 'Unknown error')
				}
			});

			// Assign references only after successful creation
			this.queryClient = queryClient;
			this.subscriptionClient = subscriptionClient;
			this.workflowSyncManager = workflowSyncManager;
			this.workflowExecutionSyncManager = workflowExecutionSyncManager;
			this.workflowNodeExecutionSyncManager = workflowNodeExecutionSyncManager;
			this.ownsWsClient = ownsWsClient;

			if (clearExisting) {
				store.clearAllAt(workflowSyncConfig.entityType);
				store.clearAllAt(workflowExecutionSyncConfig.entityType);
				store.clearAllAt(workflowNodeExecutionSyncConfig.entityType);
			}

			// Seed initial data into the store
			if (initialWorkflows.length > 0) {
				for (const item of initialWorkflows) {
					const id = workflowSyncConfig.getEntityId(item);
					if (id) {
						store.publish(toTopicPath(workflowSyncConfig.entityType, id), item);
					}
				}

				if (setupSubscriptions) {
					// Note: Create subscription will be set up with projectId when project is selected
					// (see updateCreateWorkflowSubscription in the workflow page)
					workflowSyncManager.setupSubscriptionsForEntities(initialWorkflows);
				}
			}
			// Note: Create subscription is not set up here because we need projectId
			// It will be set up via updateCreateWorkflowSubscription when project is selected

			this._status = 'ready';
		}, 'Failed to initialize workflow sync').finally(() => {
			this.initializationPromise = null;
			if (this._error) {
				this._status = 'error';
			}
		});

		return this.initializationPromise;
	}

	/**
	 * Fetches a list of workflows from the API and syncs them to the store.
	 * @throws Error if the manager is not ready.
	 */
	async syncWorkflowList(options?: EntitySyncOptions): Promise<EntitySyncResult<Workflow>> {
		this.#ensureReady();
		return this.#runWithStatus(
			() => this.workflowSyncManager!.syncList(options),
			'Failed to sync workflow list'
		);
	}

	/**
	 * Fetches a single workflow by ID from the API and syncs it to the store.
	 * @throws Error if the manager is not ready.
	 */
	async syncWorkflow(id: string, options?: EntitySyncOptions): Promise<Workflow | null> {
		this.#ensureReady();
		return this.#runWithStatus(
			() => this.workflowSyncManager!.syncOne(id, options),
			`Failed to sync workflow ${id}`
		);
	}

	/**
	 * Fetches a list of workflow executions from the API and syncs them to the store.
	 * Uses projectId as parentId when workflowId is not available (e.g., when saving a new workflow).
	 * Skips the API call if both workflowId and projectId are missing (listWorkflowExecutions requires parentId: ID!).
	 * @throws Error if the manager is not ready.
	 */
	async syncWorkflowExecutionList(
		workflowId?: string,
		projectId?: string,
		options?: EntitySyncOptions
	): Promise<EntitySyncResult<WorkflowExecution>> {
		// Use projectId as parentId when workflowId is not available
		const parentId = workflowId || projectId;
		if (!parentId) {
			return { entities: [], count: 0, subscriptionsEnabled: false };
		}
		this.#ensureReady();
		// onCreateWorkflowExecution(parentId: ID!) requires parentId (workflow ID); skip create subscription when missing
		const setupSubscriptions = options?.setupSubscriptions && !!workflowId;
		return this.#runWithStatus(
			() =>
				this.workflowExecutionSyncManager!.syncList({
					...options,
					setupSubscriptions,
					queryVariables: { ...options?.queryVariables, workflowId, projectId }
				}),
			'Failed to sync workflow execution list'
		);
	}

	/**
	 * Fetches a single workflow execution by ID from the API and syncs it to the store.
	 * @throws Error if the manager is not ready.
	 */
	async syncWorkflowExecution(id: string, options?: EntitySyncOptions): Promise<WorkflowExecution | null> {
		this.#ensureReady();
		return this.#runWithStatus(
			() => this.workflowExecutionSyncManager!.syncOne(id, options),
			`Failed to sync workflow execution ${id}`
		);
	}

	/**
	 * Fetches a list of workflow node executions from the API and syncs them to the store.
	 * Skips the API call if workflowExecutionId is missing (listWorkflowNodeExecutions requires parentId: ID!).
	 * Note: workflowExecutionId parameter is the WorkflowExecution ID (parent of node executions), which is passed as parentId to the query.
	 * @throws Error if the manager is not ready.
	 */
	async syncWorkflowNodeExecutionList(
		workflowExecutionId?: string,
		options?: EntitySyncOptions
	): Promise<EntitySyncResult<WorkflowNodeExecution>> {
		if (!workflowExecutionId) {
			return { entities: [], count: 0, subscriptionsEnabled: false };
		}
		this.#ensureReady();
		const result = await this.#runWithStatus(
			() =>
				this.workflowNodeExecutionSyncManager!.syncList({
					...options,
					queryVariables: { ...options?.queryVariables, workflowExecutionId } // buildListVariables maps this to parentId
				}),
			'Failed to sync workflow node execution list'
		);
		if (options?.setupSubscriptions) {
			// Set up the status change subscription
			this.setupWorkflowNodeExecutionSubscriptions(workflowExecutionId);
			// Also ensure create subscription is set up with the correct parentId
			// The EntitySyncManager should have already set it up, but we ensure it has the right variables
			this.workflowNodeExecutionSyncManager!.setupCreateSubscription({ workflowExecutionId });
		}
		return result;
	}

	/**
	 * Updates the create workflow subscription with the current projectId.
	 * This ensures that onCreateWorkflow events are filtered by the correct parentId.
	 * @param projectId The project ID to filter workflow creations by
	 */
	updateCreateWorkflowSubscription(projectId?: string): void {
		this.#ensureReady();
		this.workflowSyncManager!.setupCreateSubscription({ projectId });
	}

	/**
	 * Sets up subscriptions for workflow execution status changes for a specific workflow.
	 */
	setupWorkflowExecutionSubscriptions(workflowId: string): void {
		this.#ensureReady();
		// Note: This would require custom subscription setup since the status change subscription
		// uses different variables. For now, we'll rely on the standard update subscription.
		// The EntitySyncManager will handle update subscriptions automatically.
	}

	/**
	 * Sets up subscriptions for workflow node execution status changes for a specific workflow execution.
	 * Publishes updates to validatedTopicStore; WorkflowExecutionsPanel reacts via store subscriptions.
	 */
	setupWorkflowNodeExecutionSubscriptions(workflowExecutionId: string): void {
		this.#ensureReady();

		if (this.nodeExecutionSubscriptions.has(workflowExecutionId)) {
			console.log('[WorkflowSyncManager] Node execution subscription already exists for:', workflowExecutionId);
			return;
		}

		console.log('[WorkflowSyncManager] Setting up node execution subscription for:', workflowExecutionId);

		const spec: SubscriptionSpec<any> = {
			query: S_ON_WORKFLOW_NODE_EXECUTION_STATUS_CHANGE,
			variables: { parentId: workflowExecutionId },
			next: (payload: any) => {
				const subscriptionType = 'onWorkflowNodeExecutionStatusChange';
				const nodeExec = payload?.onWorkflowNodeExecutionStatusChange;
				console.log('[WorkflowSyncManager] GraphQL Subscription Update Received - WORKFLOW_NODE_EXECUTION:', {
					entityType: 'WORKFLOW_NODE_EXECUTION',
					subscriptionType,
					subscriptionOperation: 'STATUS_CHANGE',
					workflowExecutionId,
					nodeExec,
					payload,
					timestamp: new Date().toISOString()
				});
				if (nodeExec && nodeExec.parentId === workflowExecutionId) {
					const topicPath = toTopicPath('workflowNodeExecutions', nodeExec.id);
					console.log('[WorkflowSyncManager] Publishing WORKFLOW_NODE_EXECUTION to store:', {
						entityType: 'WORKFLOW_NODE_EXECUTION',
						subscriptionType,
						subscriptionOperation: 'STATUS_CHANGE',
						topicPath,
						nodeExecId: nodeExec.id,
						status: nodeExec.status,
						nodeId: nodeExec.nodeId,
						timestamp: new Date().toISOString()
					});
					store.publish(topicPath, nodeExec);
					this.#recordEvent('workflowNodeExecution', 'statusChange', nodeExec.id, nodeExec);
				} else {
					console.warn('[WorkflowSyncManager] Node execution parentId mismatch or missing:', {
						subscriptionType,
						subscriptionOperation: 'STATUS_CHANGE',
						expected: workflowExecutionId,
						received: nodeExec?.parentId,
						nodeExec
					});
				}
			},
			error: (e: any) => {
				console.error('[WorkflowSyncManager] Node execution subscription error:', e);
				this.#recordEvent(
					'workflowNodeExecution',
					'statusChange',
					workflowExecutionId,
					null,
					e?.message ?? 'Unknown error'
				);
			}
		};

		this.subscriptionClient!.addSubscription(spec);
		this.nodeExecutionSubscriptions.set(workflowExecutionId, spec);
		console.log('[WorkflowSyncManager] Node execution subscription added successfully for:', workflowExecutionId);
	}

	/**
	 * Removes the WorkflowNodeExecution status-change subscription for a workflow execution.
	 */
	removeWorkflowNodeExecutionSubscriptions(workflowExecutionId: string): void {
		const spec = this.nodeExecutionSubscriptions.get(workflowExecutionId);
		if (spec && this.subscriptionClient) {
			this.subscriptionClient.removeSubscription(spec);
			this.nodeExecutionSubscriptions.delete(workflowExecutionId);
		}
	}

	/**
	 * Subscribe to subscription events
	 */
	onSubscriptionEvent(listener: (event: SubscriptionEvent) => void): () => void {
		this.eventListeners.add(listener);
		return () => {
			this.eventListeners.delete(listener);
		};
	}

	/**
	 * Get all subscription events
	 */
	get subscriptionEvents(): SubscriptionEvent[] {
		return [...this._subscriptionEvents];
	}

	/**
	 * Clear subscription events
	 */
	clearSubscriptionEvents(): void {
		this._subscriptionEvents = [];
	}

	/**
	 * Record a subscription event
	 */
	#recordEvent(
		entityType: 'workflow' | 'workflowExecution' | 'workflowNodeExecution',
		operation: 'create' | 'update' | 'delete' | 'statusChange',
		entityId: string,
		data: any,
		error?: string
	): void {
		const event: SubscriptionEvent = {
			id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
			timestamp: new Date(),
			entityType,
			operation,
			entityId,
			data,
			error
		};

		this._subscriptionEvents.push(event);

		// Keep only the last 1000 events to prevent memory issues
		if (this._subscriptionEvents.length > 1000) {
			this._subscriptionEvents = this._subscriptionEvents.slice(-1000);
		}

		// Notify listeners
		this.eventListeners.forEach((listener) => {
			try {
				listener(event);
			} catch (err) {
				console.error('Error in subscription event listener:', err);
			}
		});
	}

	/**
	 * Cleans up resources, unsubscribes from real-time updates, and destroys clients if they are owned by this manager.
	 */
	cleanup(): void {
		// Remove all WorkflowNodeExecution status-change subscriptions before tearing down clients
		for (const execId of [...this.nodeExecutionSubscriptions.keys()]) {
			this.removeWorkflowNodeExecutionSubscriptions(execId);
		}

		this.workflowSyncManager?.cleanup();
		this.workflowExecutionSyncManager?.cleanup();
		this.workflowNodeExecutionSyncManager?.cleanup();

		if (this.ownsWsClient) {
			destroyAppSyncWsClient();
		}

		this.queryClient = null;
		this.subscriptionClient = null;
		this.workflowSyncManager = null;
		this.workflowExecutionSyncManager = null;
		this.workflowNodeExecutionSyncManager = null;
		this.ownsWsClient = false;
		this._status = 'inactive';
		this._loading = false;
		this._error = null;
		this.initializationPromise = null;
		this.eventListeners.clear();
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
		if (this._status !== 'ready' || !this.workflowSyncManager) {
			throw new Error(`WorkflowSyncManager is not ready. Current status: ${this._status}`);
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
