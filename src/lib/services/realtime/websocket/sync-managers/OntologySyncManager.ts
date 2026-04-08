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
	toOntologyDefTopic,
	toOntologyInstDataTopic,
	toOntologyInstMetaTopic,
	extractInstanceData,
	extractInstanceMeta,
} from '$lib/services/realtime/store/ontologyClientHelpers';
import { BaseSyncManager, type BaseSyncManagerOptions } from './BaseSyncManager';
import { SYSTEM_PROJECT_ID } from '$lib/services/widgetPromptService';
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
		// #region agent log
		fetch('http://127.0.0.1:7378/ingest/4d5fe42c-52eb-4139-a797-75aa8980d08f',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'7fe1b0'},body:JSON.stringify({sessionId:'7fe1b0',location:'OntologySyncManager.ts:doInitialize-start',message:'doInitialize called',data:{projectId,hasQueryClient:!!this.queryClient,hasSubClient:!!this.subscriptionClient},timestamp:Date.now(),hypothesisId:'H-A'})}).catch(()=>{});
		// #endregion

		const schemaLoader = new OntologySchemaLoader(store, this.queryClient!);
		const definitions = await schemaLoader.loadDefinitions(projectId);
		const systemDefs = await schemaLoader.loadDefinitions(SYSTEM_PROJECT_ID);
		// #region agent log
		fetch('http://127.0.0.1:7378/ingest/4d5fe42c-52eb-4139-a797-75aa8980d08f',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'7fe1b0'},body:JSON.stringify({sessionId:'7fe1b0',location:'OntologySyncManager.ts:doInitialize-afterDefs',message:'definitions loaded',data:{defCount:definitions.length,systemDefCount:systemDefs.length,defNames:definitions.map(d=>d.name)},timestamp:Date.now(),hypothesisId:'H-E'})}).catch(()=>{});
		// #endregion

		await this.#loadInstances(projectId, definitions);

		this.schemaLoader = schemaLoader;

		this.#setupSubscriptions(this.subscriptionClient!, projectId);
		// #region agent log
		fetch('http://127.0.0.1:7378/ingest/4d5fe42c-52eb-4139-a797-75aa8980d08f',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'7fe1b0'},body:JSON.stringify({sessionId:'7fe1b0',location:'OntologySyncManager.ts:doInitialize-complete',message:'doInitialize complete',data:{projectId,status:'success'},timestamp:Date.now(),hypothesisId:'H-A'})}).catch(()=>{});
		// #endregion
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
		await this.schemaLoader!.loadDefinitions(SYSTEM_PROJECT_ID);
		await this.#loadInstances(this.projectId, definitions);
	}

	// ── Instance loading (HTTP) ───────────────────────────────────────

	async #loadInstances(
		projectId: string,
		definitions: EntityDefinition[],
	): Promise<void> {
		// #region agent log
		fetch('http://127.0.0.1:7378/ingest/4d5fe42c-52eb-4139-a797-75aa8980d08f',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'7fe1b0'},body:JSON.stringify({sessionId:'7fe1b0',location:'OntologySyncManager.ts:#loadInstances',message:'loadInstances called',data:{projectId,defCount:definitions.length,defIds:definitions.map(d=>d.id)},timestamp:Date.now(),hypothesisId:'H-B'})}).catch(()=>{});
		// #endregion
		for (const def of definitions) {
			try {
				const result = await this.queryClient!.query<{
					listEntityInstancesByDefinition: EntityInstance[] | null;
				}>(Q_LIST_ENTITY_INSTANCES_BY_DEFINITION, {
					projectId,
					definitionId: def.id,
				});

				const instances = result.listEntityInstancesByDefinition ?? [];
				// #region agent log
				fetch('http://127.0.0.1:7378/ingest/4d5fe42c-52eb-4139-a797-75aa8980d08f',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'7fe1b0'},body:JSON.stringify({sessionId:'7fe1b0',location:'OntologySyncManager.ts:#loadInstances-query',message:'query result',data:{defId:def.id,defName:def.name,instanceCount:instances.length,rawResultKeys:Object.keys(result),hasNulls:instances.some(i=>!i)},timestamp:Date.now(),hypothesisId:'H-B'})}).catch(()=>{});
				// #endregion
				for (const inst of instances) {
					if (!inst) continue;
					const flat = extractInstanceData(inst);
					const dataTopic = toOntologyInstDataTopic(projectId, def.id, inst.id);
					const dataOk = store.publish(dataTopic, flat, { source: 'http' });
					const metaTopic = toOntologyInstMetaTopic(projectId, def.id, inst.id);
					const metaOk = store.publish(metaTopic, extractInstanceMeta(inst), { source: 'http' });
					// #region agent log
					fetch('http://127.0.0.1:7378/ingest/4d5fe42c-52eb-4139-a797-75aa8980d08f',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'7fe1b0'},body:JSON.stringify({sessionId:'7fe1b0',location:'OntologySyncManager.ts:#loadInstances-publish',message:'publish result',data:{instId:inst.id,dataTopic,dataOk,metaTopic,metaOk,flatKeys:Object.keys(flat),storeErrors:!dataOk?store.getErrors(dataTopic):null},timestamp:Date.now(),hypothesisId:'H-C'})}).catch(()=>{});
					// #endregion
				}
			} catch (err) {
				// #region agent log
				fetch('http://127.0.0.1:7378/ingest/4d5fe42c-52eb-4139-a797-75aa8980d08f',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'7fe1b0'},body:JSON.stringify({sessionId:'7fe1b0',location:'OntologySyncManager.ts:#loadInstances-error',message:'query failed',data:{defId:def.id,error:err instanceof Error?err.message:String(err)},timestamp:Date.now(),hypothesisId:'H-B'})}).catch(()=>{});
				// #endregion
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
		}, client);

		this.#addSub('inst-deleted', {
			query: S_ON_INSTANCE_DELETED,
			variables: { projectId },
			path: 'onInstanceDeleted',
			next: (inst: any) => {
				log.debug('Instance deleted:', inst.id);
				store.delete(
					toOntologyInstDataTopic(projectId, inst.definitionId, inst.id),
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
		this.ensureReady();
		await this.queryClient!.query(M_DELETE_ENTITY_INSTANCE, {
			projectId,
			id: instanceId,
		});

		store.delete(toOntologyInstDataTopic(projectId, definitionId, instanceId));
	}

	getSchemaLoader(): OntologySchemaLoader | null {
		return this.schemaLoader;
	}
}
