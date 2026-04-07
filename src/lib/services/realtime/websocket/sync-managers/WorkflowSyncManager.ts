import { browser } from '$app/environment';
import type { Workflow, WorkflowExecution, WorkflowNodeExecution } from '@stratiqai/types-simple';
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
	Q_GET_WORKFLOW_NODE_EXECUTION,
	Q_LIST_WORKFLOW_NODE_EXECUTIONS,
	S_ON_CREATE_WORKFLOW_NODE_EXECUTION,
	S_ON_UPDATE_WORKFLOW_NODE_EXECUTION,
	S_ON_WORKFLOW_NODE_EXECUTION_STATUS_CHANGE
} from '@stratiqai/types-simple';
import { validatedTopicStore } from '$lib/stores/validatedTopicStore';
import type { SubscriptionSpec } from '../types';
import { EntitySyncManager } from '$lib/services/realtime/store/EntitySyncManager';
import type { EntitySyncOptions, EntitySyncResult } from '$lib/services/realtime/store/EntitySyncConfig';
import { createWorkflowSyncConfig, createEntitySyncConfig } from '$lib/services/realtime/store/EntitySyncHelpers';
import { toTopicPath } from '$lib/services/realtime/store/TopicMapper';
import { BaseSyncManager, type BaseSyncManagerOptions } from './BaseSyncManager';
import { createLogger } from '$lib/utils/logger';

const log = createLogger('sync');

export const store = validatedTopicStore;

if (browser && typeof window !== 'undefined') {
	(window as any).dumpWorkflowStore = () => {
		log.debug('ValidatedTopicStore workflow contents:', store.toJSON());
		return store.toJSON();
	};
}

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

const workflowExecutionSyncConfig = createEntitySyncConfig<WorkflowExecution>({
	entityType: 'workflowExecutions',
	listQuery: Q_LIST_WORKFLOW_EXECUTIONS,
	getQuery: Q_GET_WORKFLOW_EXECUTION,
	createSubscription: S_ON_CREATE_WORKFLOW_EXECUTION,
	updateSubscription: S_ON_UPDATE_WORKFLOW_EXECUTION,
	deleteSubscription: S_ON_UPDATE_WORKFLOW_EXECUTION,
	listResponsePath: 'listWorkflowExecutions.items',
	getResponsePath: 'getWorkflowExecution',
	createSubscriptionPath: 'onCreateWorkflowExecution',
	updateSubscriptionPath: 'onUpdateWorkflowExecution',
	deleteSubscriptionPath: 'onUpdateWorkflowExecution',
	buildListVariables: (options?: Record<string, any>) => ({
		parentId: options?.workflowId || options?.projectId,
		status: options?.status,
		limit: options?.limit,
		nextToken: options?.nextToken
	}),
	buildCreateVariables: (options?: Record<string, any>) => ({
		parentId: options?.workflowId ?? (options?.entity as { parentId?: string } | undefined)?.parentId
	}),
	buildUpdateVariables: (id: string) => ({ id })
});

const workflowNodeExecutionSyncConfig = createEntitySyncConfig<WorkflowNodeExecution>({
	entityType: 'workflowNodeExecutions',
	listQuery: Q_LIST_WORKFLOW_NODE_EXECUTIONS,
	getQuery: Q_GET_WORKFLOW_NODE_EXECUTION,
	createSubscription: S_ON_CREATE_WORKFLOW_NODE_EXECUTION,
	updateSubscription: S_ON_UPDATE_WORKFLOW_NODE_EXECUTION,
	deleteSubscription: S_ON_UPDATE_WORKFLOW_NODE_EXECUTION,
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
		parentId: options?.workflowExecutionId ?? (options?.entity as { parentId?: string } | undefined)?.parentId
	}),
	buildUpdateVariables: (id: string) => ({ id })
});

export interface WorkflowManagerOptions extends BaseSyncManagerOptions {
	initialWorkflows?: Workflow[];
	setupSubscriptions?: boolean;
	clearExisting?: boolean;
}

export type SubscriptionEvent = {
	id: string;
	timestamp: Date;
	entityType: 'workflow' | 'workflowExecution' | 'workflowNodeExecution';
	operation: 'create' | 'update' | 'delete' | 'statusChange';
	entityId: string;
	data: any;
	error?: string;
};

export class WorkflowSyncManager extends BaseSyncManager {
	private workflowSyncManager: EntitySyncManager<Workflow> | null = null;
	private workflowExecutionSyncManager: EntitySyncManager<WorkflowExecution> | null = null;
	private workflowNodeExecutionSyncManager: EntitySyncManager<WorkflowNodeExecution> | null = null;

	private _subscriptionEvents: SubscriptionEvent[] = [];
	private eventListeners: Set<(event: SubscriptionEvent) => void> = new Set();
	private nodeExecutionSubscriptions: Map<string, SubscriptionSpec<any>> = new Map();

	protected get managerName() {
		return 'WorkflowSyncManager';
	}

	private constructor() {
		super();
	}

	static createInactive(): WorkflowSyncManager {
		return new WorkflowSyncManager();
	}

	static async create(options: WorkflowManagerOptions): Promise<WorkflowSyncManager> {
		const manager = new WorkflowSyncManager();
		await manager.initialize(options);
		return manager;
	}

	protected async doInitialize(options: WorkflowManagerOptions): Promise<void> {
		const {
			initialWorkflows = [],
			setupSubscriptions = false,
			clearExisting = false
		} = options;

		const wfSync = new EntitySyncManager<Workflow>({
			queryClient: this.queryClient!,
			subscriptionClient: this.subscriptionClient!,
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

		const execSync = new EntitySyncManager<WorkflowExecution>({
			queryClient: this.queryClient!,
			subscriptionClient: this.subscriptionClient!,
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

		const nodeExecSync = new EntitySyncManager<WorkflowNodeExecution>({
			queryClient: this.queryClient!,
			subscriptionClient: this.subscriptionClient!,
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

		this.workflowSyncManager = wfSync;
		this.workflowExecutionSyncManager = execSync;
		this.workflowNodeExecutionSyncManager = nodeExecSync;

		if (clearExisting) {
			store.clearAllAt(workflowSyncConfig.entityType);
			store.clearAllAt(workflowExecutionSyncConfig.entityType);
			store.clearAllAt(workflowNodeExecutionSyncConfig.entityType);
		}

		if (initialWorkflows.length > 0) {
			for (const item of initialWorkflows) {
				const id = workflowSyncConfig.getEntityId(item);
				if (id) {
					store.publish(toTopicPath(workflowSyncConfig.entityType, id), item, { source: 'http' });
				}
			}
			if (setupSubscriptions) {
				wfSync.setupSubscriptionsForEntities(initialWorkflows);
			}
		}
	}

	protected doCleanup(): void {
		for (const execId of [...this.nodeExecutionSubscriptions.keys()]) {
			this.removeWorkflowNodeExecutionSubscriptions(execId);
		}

		this.workflowSyncManager?.cleanup();
		this.workflowExecutionSyncManager?.cleanup();
		this.workflowNodeExecutionSyncManager?.cleanup();

		this.workflowSyncManager = null;
		this.workflowExecutionSyncManager = null;
		this.workflowNodeExecutionSyncManager = null;
		this.eventListeners.clear();
	}

	protected async doRefetch(): Promise<void> {
		if (this.workflowSyncManager) {
			await this.workflowSyncManager.syncList({ clearExisting: true, setupSubscriptions: true });
		}
	}

	// ── Workflow sync methods ─────────────────────────────────────────

	async syncWorkflowList(options?: EntitySyncOptions): Promise<EntitySyncResult<Workflow>> {
		this.ensureReady();
		return this.runWithStatus(
			() => this.workflowSyncManager!.syncList(options),
			'Failed to sync workflow list'
		);
	}

	async syncWorkflow(id: string, options?: EntitySyncOptions): Promise<Workflow | null> {
		this.ensureReady();
		return this.runWithStatus(
			() => this.workflowSyncManager!.syncOne(id, options),
			`Failed to sync workflow ${id}`
		);
	}

	async syncWorkflowExecutionList(
		workflowId?: string,
		projectId?: string,
		options?: EntitySyncOptions
	): Promise<EntitySyncResult<WorkflowExecution>> {
		const parentId = workflowId || projectId;
		if (!parentId) {
			return { entities: [], count: 0, subscriptionsEnabled: false };
		}
		this.ensureReady();
		const setupSubscriptions = options?.setupSubscriptions && !!workflowId;
		return this.runWithStatus(
			() =>
				this.workflowExecutionSyncManager!.syncList({
					...options,
					setupSubscriptions,
					queryVariables: { ...options?.queryVariables, workflowId, projectId }
				}),
			'Failed to sync workflow execution list'
		);
	}

	async syncWorkflowExecution(id: string, options?: EntitySyncOptions): Promise<WorkflowExecution | null> {
		this.ensureReady();
		return this.runWithStatus(
			() => this.workflowExecutionSyncManager!.syncOne(id, options),
			`Failed to sync workflow execution ${id}`
		);
	}

	async syncWorkflowNodeExecutionList(
		workflowExecutionId?: string,
		options?: EntitySyncOptions
	): Promise<EntitySyncResult<WorkflowNodeExecution>> {
		if (!workflowExecutionId) {
			return { entities: [], count: 0, subscriptionsEnabled: false };
		}
		this.ensureReady();
		const result = await this.runWithStatus(
			() =>
				this.workflowNodeExecutionSyncManager!.syncList({
					...options,
					queryVariables: { ...options?.queryVariables, workflowExecutionId }
				}),
			'Failed to sync workflow node execution list'
		);
		if (options?.setupSubscriptions) {
			this.setupWorkflowNodeExecutionSubscriptions(workflowExecutionId);
			this.workflowNodeExecutionSyncManager!.setupCreateSubscription({ workflowExecutionId });
		}
		return result;
	}

	updateCreateWorkflowSubscription(projectId?: string): void {
		this.ensureReady();
		this.workflowSyncManager!.setupCreateSubscription({ projectId });
	}

	setupWorkflowExecutionSubscriptions(_workflowId: string): void {
		this.ensureReady();
	}

	setupWorkflowNodeExecutionSubscriptions(workflowExecutionId: string): void {
		this.ensureReady();

		if (this.nodeExecutionSubscriptions.has(workflowExecutionId)) {
			return;
		}

		const spec: SubscriptionSpec<any> = {
			query: S_ON_WORKFLOW_NODE_EXECUTION_STATUS_CHANGE,
			variables: { parentId: workflowExecutionId },
			next: (payload: any) => {
				const nodeExec = payload?.onWorkflowNodeExecutionStatusChange;
				if (nodeExec && nodeExec.parentId === workflowExecutionId) {
					const topicPath = toTopicPath('workflowNodeExecutions', nodeExec.id);
					store.publish(topicPath, nodeExec);
					this.#recordEvent('workflowNodeExecution', 'statusChange', nodeExec.id, nodeExec);
				}
			},
			error: (e: any) => {
				log.error('Node execution subscription error:', e);
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
	}

	removeWorkflowNodeExecutionSubscriptions(workflowExecutionId: string): void {
		const spec = this.nodeExecutionSubscriptions.get(workflowExecutionId);
		if (spec && this.subscriptionClient) {
			this.subscriptionClient.removeSubscription(spec);
			this.nodeExecutionSubscriptions.delete(workflowExecutionId);
		}
	}

	// ── Subscription event tracking ───────────────────────────────────

	onSubscriptionEvent(listener: (event: SubscriptionEvent) => void): () => void {
		this.eventListeners.add(listener);
		return () => {
			this.eventListeners.delete(listener);
		};
	}

	get subscriptionEvents(): SubscriptionEvent[] {
		return [...this._subscriptionEvents];
	}

	clearSubscriptionEvents(): void {
		this._subscriptionEvents = [];
	}

	#recordEvent(
		entityType: 'workflow' | 'workflowExecution' | 'workflowNodeExecution',
		operation: 'create' | 'update' | 'delete' | 'statusChange',
		entityId: string,
		data: any,
		error?: string
	): void {
		const event: SubscriptionEvent = {
			id: `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
			timestamp: new Date(),
			entityType,
			operation,
			entityId,
			data,
			error
		};

		this._subscriptionEvents.push(event);

		if (this._subscriptionEvents.length > 1000) {
			this._subscriptionEvents = this._subscriptionEvents.slice(-1000);
		}

		for (const listener of this.eventListeners) {
			try {
				listener(event);
			} catch (err) {
				log.error('Error in subscription event listener:', err);
			}
		}
	}

	get store() {
		return store;
	}
}
