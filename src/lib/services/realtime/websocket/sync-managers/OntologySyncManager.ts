/**
 * OntologySyncManager
 *
 * Manages the full lifecycle of ontology data in the browser:
 *   1. Fetches definitions + instances via HTTP (GraphQLQueryClient)
 *   2. Registers definition schemas into VTS (OntologySchemaLoader)
 *   3. Publishes instance data as flat maps into VTS
 *   4. Subscribes to real-time changes (create/update/delete) via wsClient.ts
 *   5. Implements echo cancellation using a per-tab senderId
 *
 * Follows the same lifecycle pattern as WorkflowSyncManager:
 *   private constructor -> static create() / createInactive() -> initialize()
 */

import { PUBLIC_GRAPHQL_HTTP_ENDPOINT } from '$env/static/public';
import type {
	EntityDefinition,
	EntityInstance,
	SaveInstanceInput,
} from '@stratiqai/types-simple';
import {
	Q_LIST_ENTITY_INSTANCES_BY_DEFINITION,
	S_ON_DEFINITION_SAVED,
	S_ON_DEFINITION_DELETED,
	S_ON_PROJECT_INSTANCES_CHANGED,
	S_ON_INSTANCE_DELETED,
	M_SAVE_ENTITY_INSTANCE,
	M_DELETE_ENTITY_INSTANCE,
} from '@stratiqai/types-simple';

import { validatedTopicStore } from '$lib/stores/validatedTopicStore';
import {
	getAppSyncWsClient,
	initAppSyncWsClient,
	destroyAppSyncWsClient,
	type AppSyncWsClient,
} from '../wsClient';
import type { SubscriptionSpec } from '../types';
import { GraphQLQueryClient } from '$lib/services/realtime/store/GraphQLQueryClient';
import { OntologySchemaLoader } from '$lib/services/realtime/store/OntologySchemaLoader';
import { getBrowserClientId } from '$lib/services/realtime/store/browserClientId';
import {
	toOntologyDefTopic,
	toOntologyInstDataTopic,
	toOntologyInstMetaTopic,
	extractInstanceData,
	extractInstanceMeta,
} from '$lib/services/realtime/store/ontologyClientHelpers';
import { createLogger } from '$lib/utils/logger';

const log = createLogger('ontology-sync');

export const store = validatedTopicStore;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type OntologyManagerOptions = {
	idToken: string;
	projectId: string;
};

type ManagerStatus = 'inactive' | 'initializing' | 'ready' | 'error';

// ---------------------------------------------------------------------------
// OntologySyncManager
// ---------------------------------------------------------------------------

export class OntologySyncManager {
	private queryClient: GraphQLQueryClient | null = null;
	private subscriptionClient: AppSyncWsClient | null = null;
	private schemaLoader: OntologySchemaLoader | null = null;
	private ownsWsClient = false;
	private projectId = '';
	private senderId: string;
	private activeSubscriptions = new Map<string, SubscriptionSpec<unknown>>();

	private _status: ManagerStatus = 'inactive';
	private _loading = false;
	private _error: string | null = null;
	private initializationPromise: Promise<void> | null = null;

	private constructor() {
		this.senderId = getBrowserClientId();
	}

	static createInactive(): OntologySyncManager {
		return new OntologySyncManager();
	}

	static async create(options: OntologyManagerOptions): Promise<OntologySyncManager> {
		const mgr = new OntologySyncManager();
		await mgr.initialize(options);
		return mgr;
	}

	// -----------------------------------------------------------------------
	// Initialization
	// -----------------------------------------------------------------------

	async initialize({ idToken, projectId }: OntologyManagerOptions): Promise<void> {
		if (this.initializationPromise) return this.initializationPromise;
		if (this._status === 'ready') this.cleanup();

		this._status = 'initializing';

		this.initializationPromise = this.#runWithStatus(async () => {
			if (!idToken) throw new Error('OntologySyncManager requires an idToken.');
			if (!projectId) throw new Error('OntologySyncManager requires a projectId.');

			this.projectId = projectId;
			const queryClient = new GraphQLQueryClient(idToken);

			const existingClient = getAppSyncWsClient();
			const ownsWsClient = !existingClient;
			const subscriptionClient =
				existingClient ??
				initAppSyncWsClient({
					graphqlHttpUrl: PUBLIC_GRAPHQL_HTTP_ENDPOINT,
					auth: { mode: 'cognito', idToken },
				});

			await subscriptionClient.ready();

			const schemaLoader = new OntologySchemaLoader(store, queryClient);
			const definitions = await schemaLoader.loadDefinitions(projectId);

			await this.#loadInstances(queryClient, projectId, definitions);

			this.queryClient = queryClient;
			this.subscriptionClient = subscriptionClient;
			this.schemaLoader = schemaLoader;
			this.ownsWsClient = ownsWsClient;

			this.#setupSubscriptions(subscriptionClient, projectId);

			this._status = 'ready';
		}, 'Failed to initialize ontology sync').finally(() => {
			this.initializationPromise = null;
			if (this._error) this._status = 'error';
		});

		return this.initializationPromise;
	}

	// -----------------------------------------------------------------------
	// Instance loading (HTTP)
	// -----------------------------------------------------------------------

	async #loadInstances(
		queryClient: GraphQLQueryClient,
		projectId: string,
		definitions: EntityDefinition[],
	): Promise<void> {
		for (const def of definitions) {
			try {
				const result = await queryClient.query<{
					listEntityInstancesByDefinition: EntityInstance[] | null;
				}>(Q_LIST_ENTITY_INSTANCES_BY_DEFINITION, {
					projectId,
					definitionId: def.id,
				});

				const instances = result.listEntityInstancesByDefinition ?? [];
				for (const inst of instances) {
					const flat = extractInstanceData(inst);
					store.publish(
						toOntologyInstDataTopic(projectId, def.id, inst.id),
						flat,
					);
					store.publish(
						toOntologyInstMetaTopic(projectId, def.id, inst.id),
						extractInstanceMeta(inst),
					);
				}
			} catch (err) {
				log.error(`Failed to load instances for definition ${def.id}:`, err);
			}
		}
	}

	// -----------------------------------------------------------------------
	// Subscriptions (WebSocket)
	// -----------------------------------------------------------------------

	#setupSubscriptions(client: AppSyncWsClient, projectId: string): void {
		this.#addSub('def-saved', {
			query: S_ON_DEFINITION_SAVED,
			variables: { projectId },
			path: 'onDefinitionSaved',
			next: (def: EntityDefinition) => {
				log.debug('Definition saved:', def.id);
				this.schemaLoader?.registerDefinitionSchema(def);
			},
		} as SubscriptionSpec<EntityDefinition>, client);

		this.#addSub('def-deleted', {
			query: S_ON_DEFINITION_DELETED,
			variables: { projectId },
			path: 'onDefinitionDeleted',
			next: (def: { id: string; projectId: string }) => {
				log.debug('Definition deleted:', def.id);
				this.schemaLoader?.unregisterDefinitionSchema(def.id, projectId);
			},
		} as SubscriptionSpec<{ id: string; projectId: string }>, client);

		this.#addSub('inst-changed', {
			query: S_ON_PROJECT_INSTANCES_CHANGED,
			variables: { projectId },
			path: 'onProjectInstancesChanged',
			next: (inst: EntityInstance) => {
				if (inst.senderId === this.senderId) return;

				const flat = extractInstanceData(inst);
				store.publish(
					toOntologyInstDataTopic(projectId, inst.definitionId, inst.id),
					flat,
				);
				store.publish(
					toOntologyInstMetaTopic(projectId, inst.definitionId, inst.id),
					extractInstanceMeta(inst),
				);
			},
		} as SubscriptionSpec<EntityInstance>, client);

		this.#addSub('inst-deleted', {
			query: S_ON_INSTANCE_DELETED,
			variables: { projectId },
			path: 'onInstanceDeleted',
			next: (inst: { id: string; definitionId: string }) => {
				log.debug('Instance deleted:', inst.id);
				store.delete(
					toOntologyInstDataTopic(projectId, inst.definitionId, inst.id),
				);
			},
		} as SubscriptionSpec<{ id: string; definitionId: string }>, client);
	}

	#addSub(key: string, spec: SubscriptionSpec<unknown>, client: AppSyncWsClient): void {
		client.addSubscription(spec);
		this.activeSubscriptions.set(key, spec);
	}

	// -----------------------------------------------------------------------
	// Mutation helpers (inject senderId automatically)
	// -----------------------------------------------------------------------

	async saveInstance(input: Omit<SaveInstanceInput, 'senderId'>): Promise<EntityInstance> {
		this.#ensureReady();
		const fullInput: SaveInstanceInput = { ...input, senderId: this.senderId };

		const result = await this.queryClient!.query<{
			saveEntityInstance: EntityInstance;
		}>(M_SAVE_ENTITY_INSTANCE, { input: fullInput });

		const inst = result.saveEntityInstance;
		const flat = extractInstanceData(inst);
		store.publish(
			toOntologyInstDataTopic(inst.projectId, inst.definitionId, inst.id),
			flat,
		);
		store.publish(
			toOntologyInstMetaTopic(inst.projectId, inst.definitionId, inst.id),
			extractInstanceMeta(inst),
		);

		return inst;
	}

	async deleteInstance(projectId: string, instanceId: string, definitionId: string): Promise<void> {
		this.#ensureReady();
		await this.queryClient!.query(M_DELETE_ENTITY_INSTANCE, {
			projectId,
			id: instanceId,
		});

		store.delete(toOntologyInstDataTopic(projectId, definitionId, instanceId));
	}

	// -----------------------------------------------------------------------
	// Lifecycle & state
	// -----------------------------------------------------------------------

	cleanup(): void {
		if (this.subscriptionClient) {
			for (const spec of this.activeSubscriptions.values()) {
				this.subscriptionClient.removeSubscription(spec);
			}
		}
		this.activeSubscriptions.clear();

		if (this.ownsWsClient) {
			destroyAppSyncWsClient();
		}

		this.queryClient = null;
		this.subscriptionClient = null;
		this.schemaLoader = null;
		this.ownsWsClient = false;
		this.projectId = '';
		this._status = 'inactive';
		this._loading = false;
		this._error = null;
		this.initializationPromise = null;
	}

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

	getSchemaLoader(): OntologySchemaLoader | null {
		return this.schemaLoader;
	}

	#ensureReady(): void {
		if (this._status !== 'ready' || !this.queryClient) {
			throw new Error(`OntologySyncManager is not ready. Current status: ${this._status}`);
		}
	}

	async #runWithStatus<T>(action: () => Promise<T>, fallbackMessage: string): Promise<T> {
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
}
