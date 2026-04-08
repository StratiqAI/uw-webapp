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
 * Topic paths use structuralHash (not definitionId):
 *   ontology/p/{projectId}/schema/{hash}/inst/{instanceId}/data
 *
 * Extends BaseSyncManager for unified lifecycle, auto-reconnect refetch,
 * and shared WS client acquisition.
 */

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
import type { SubscriptionSpec } from '../types';
import type { AppSyncWsClient } from '../wsClient';
import { OntologySchemaLoader } from '$lib/services/realtime/store/OntologySchemaLoader';
import { getBrowserClientId } from '$lib/services/realtime/store/browserClientId';
import {
	toOntologyInstDataTopic,
	toOntologyInstMetaTopic,
	extractInstanceData,
	extractInstanceMeta,
} from '$lib/services/realtime/store/ontologyClientHelpers';
import { BaseSyncManager, type BaseSyncManagerOptions } from './BaseSyncManager';
import { createLogger } from '$lib/utils/logger';

const log = createLogger('ontology-sync');

export const store = validatedTopicStore;

export interface OntologyManagerOptions extends BaseSyncManagerOptions {
	projectId: string;
}

export class OntologySyncManager extends BaseSyncManager {
	private schemaLoader: OntologySchemaLoader | null = null;
	private projectId = '';
	private senderId: string;
	private activeSubscriptions = new Map<string, SubscriptionSpec<any>>();

	protected get managerName() {
		return 'OntologySyncManager';
	}

	private constructor() {
		super();
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

	protected async doInitialize(options: OntologyManagerOptions): Promise<void> {
		const { projectId } = options;
		if (!projectId) throw new Error('OntologySyncManager requires a projectId.');

		this.projectId = projectId;

		const schemaLoader = new OntologySchemaLoader(store, this.queryClient!);
		schemaLoader.setPublishProjectId(projectId);

		const definitions = await schemaLoader.loadDefinitions(projectId);

		await this.#loadInstances(projectId, definitions);

		this.schemaLoader = schemaLoader;

		this.#setupSubscriptions(this.subscriptionClient!, projectId);
	}

	protected doCleanup(): void {
		if (this.subscriptionClient) {
			for (const spec of this.activeSubscriptions.values()) {
				this.subscriptionClient.removeSubscription(spec);
			}
		}
		this.activeSubscriptions.clear();
		this.schemaLoader = null;
		this.projectId = '';
	}

	protected async doRefetch(): Promise<void> {
		if (!this.queryClient || !this.projectId) return;

		const definitions = await this.schemaLoader!.loadDefinitions(this.projectId);
		await this.#loadInstances(this.projectId, definitions);
	}

	// ── Instance loading (HTTP) ───────────────────────────────────────

	async #loadInstances(
		projectId: string,
		definitions: EntityDefinition[],
	): Promise<void> {
		for (const def of definitions) {
			const hash = def.structuralHash;
			if (!hash) {
				log.warn(`Definition ${def.id} has no structuralHash, skipping instance load`);
				continue;
			}

			try {
				const result = await this.queryClient!.query<{
					listEntityInstancesByDefinition: EntityInstance[] | null;
				}>(Q_LIST_ENTITY_INSTANCES_BY_DEFINITION, {
					projectId,
					definitionId: def.id,
				});

				const instances = result.listEntityInstancesByDefinition ?? [];
				for (const inst of instances) {
					if (!inst) continue;
					const flat = extractInstanceData(inst);
					store.publish(
						toOntologyInstDataTopic(projectId, hash, inst.id),
						flat,
						{ source: 'http' },
					);
					store.publish(
						toOntologyInstMetaTopic(projectId, hash, inst.id),
						extractInstanceMeta(inst),
						{ source: 'http' },
					);
				}
			} catch (err) {
				log.error(`Failed to load instances for definition ${def.id}:`, err);
			}
		}
	}

	// ── Subscriptions (WebSocket) ─────────────────────────────────────

	#setupSubscriptions(client: AppSyncWsClient, projectId: string): void {
		this.#addSub('def-saved', {
			query: S_ON_DEFINITION_SAVED,
			variables: { projectId },
			path: 'onDefinitionSaved',
			next: (def: any) => {
				log.debug('Definition saved:', def.id);
				this.schemaLoader?.registerDefinitionSchema(def);
			},
		}, client);

		this.#addSub('def-deleted', {
			query: S_ON_DEFINITION_DELETED,
			variables: { projectId },
			path: 'onDefinitionDeleted',
			next: (def: any) => {
				log.debug('Definition deleted:', def.id);
				this.schemaLoader?.unregisterDefinitionSchema(def.id, projectId);
			},
		}, client);

		this.#addSub('inst-changed', {
			query: S_ON_PROJECT_INSTANCES_CHANGED,
			variables: { projectId },
			path: 'onProjectInstancesChanged',
			next: (inst: any) => {
				if (inst.senderId === this.senderId) return;

				const def = this.schemaLoader?.getDefinition(inst.definitionId);
				const hash = def?.structuralHash;
				if (!hash) {
					log.warn(`No structuralHash for definitionId ${inst.definitionId}, skipping instance update`);
					return;
				}

				const flat = extractInstanceData(inst);
				store.publish(
					toOntologyInstDataTopic(projectId, hash, inst.id),
					flat,
				);
				store.publish(
					toOntologyInstMetaTopic(projectId, hash, inst.id),
					extractInstanceMeta(inst),
				);
			},
		}, client);

		this.#addSub('inst-deleted', {
			query: S_ON_INSTANCE_DELETED,
			variables: { projectId },
			path: 'onInstanceDeleted',
			next: (inst: any) => {
				log.debug('Instance deleted:', inst.id);

				const def = this.schemaLoader?.getDefinition(inst.definitionId);
				const hash = def?.structuralHash;
				if (!hash) {
					log.warn(`No structuralHash for definitionId ${inst.definitionId}, skipping instance delete`);
					return;
				}

				store.delete(
					toOntologyInstDataTopic(projectId, hash, inst.id),
				);
			},
		}, client);
	}

	#addSub(key: string, spec: SubscriptionSpec<any>, client: AppSyncWsClient): void {
		client.addSubscription(spec);
		this.activeSubscriptions.set(key, spec);
	}

	// ── Mutation helpers ──────────────────────────────────────────────

	async saveInstance(input: Omit<SaveInstanceInput, 'senderId'>): Promise<EntityInstance> {
		this.ensureReady();
		const fullInput: SaveInstanceInput = { ...input, senderId: this.senderId };

		const result = await this.queryClient!.query<{
			saveEntityInstance: EntityInstance;
		}>(M_SAVE_ENTITY_INSTANCE, { input: fullInput });

		const inst = result.saveEntityInstance;
		const def = this.schemaLoader?.getDefinition(inst.definitionId);
		const hash = def?.structuralHash;
		if (!hash) {
			log.warn(`No structuralHash for definitionId ${inst.definitionId} after saveInstance`);
			return inst;
		}

		const publishProjectId = this.projectId || inst.projectId;
		const flat = extractInstanceData(inst);
		store.publish(
			toOntologyInstDataTopic(publishProjectId, hash, inst.id),
			flat,
		);
		store.publish(
			toOntologyInstMetaTopic(publishProjectId, hash, inst.id),
			extractInstanceMeta(inst),
		);

		return inst;
	}

	async deleteInstance(projectId: string, instanceId: string, definitionId: string): Promise<void> {
		this.ensureReady();
		await this.queryClient!.query(M_DELETE_ENTITY_INSTANCE, {
			projectId,
			id: instanceId,
		});

		const def = this.schemaLoader?.getDefinition(definitionId);
		const hash = def?.structuralHash;
		if (hash) {
			store.delete(toOntologyInstDataTopic(projectId, hash, instanceId));
		}
	}

	getSchemaLoader(): OntologySchemaLoader | null {
		return this.schemaLoader;
	}
}
