import { browser } from '$app/environment';
import type { Prompt } from '@stratiqai/types-simple';
import {
	Q_GET_PROMPT,
	Q_LIST_PROMPTS,
	S_ON_CREATE_PROMPT,
	S_ON_DELETE_PROMPT,
	S_ON_UPDATE_PROMPT
} from '$lib/services/graphql/promptOperations';
import { validatedTopicStore } from '$lib/stores/validatedTopicStore';
import { EntitySyncManager } from '$lib/services/realtime/store/EntitySyncManager';
import type { EntitySyncOptions, EntitySyncResult } from '$lib/services/realtime/store/EntitySyncConfig';
import { createPromptSyncConfig } from '$lib/services/realtime/store/EntitySyncHelpers';
import { toTopicPath } from '$lib/services/realtime/store/TopicMapper';
import { BaseSyncManager, type BaseSyncManagerOptions } from './BaseSyncManager';
import { createLogger } from '$lib/utils/logger';

const log = createLogger('sync');

export const store = validatedTopicStore;

if (browser && typeof window !== 'undefined') {
	(window as any).dumpStore = () => {
		log.debug('ValidatedTopicStore contents:', store.toJSON());
		return store.toJSON();
	};
}

const promptSyncConfig = createPromptSyncConfig(
	Q_LIST_PROMPTS,
	Q_GET_PROMPT,
	S_ON_UPDATE_PROMPT,
	S_ON_DELETE_PROMPT,
	S_ON_CREATE_PROMPT
);

export interface PromptSyncManagerOptions extends BaseSyncManagerOptions {
	initialItems?: Prompt[];
	setupSubscriptions?: boolean;
	clearExisting?: boolean;
}

export class PromptSyncManager extends BaseSyncManager {
	private entitySyncManager: EntitySyncManager<Prompt> | null = null;

	protected get managerName() {
		return 'PromptSyncManager';
	}

	private constructor() {
		super();
	}

	static createInactive(): PromptSyncManager {
		return new PromptSyncManager();
	}

	static async create(options: PromptSyncManagerOptions): Promise<PromptSyncManager> {
		const manager = new PromptSyncManager();
		await manager.initialize(options);
		return manager;
	}

	protected async doInitialize(options: PromptSyncManagerOptions): Promise<void> {
		const {
			initialItems = [],
			setupSubscriptions = false,
			clearExisting = false
		} = options;

		const entitySyncManager = new EntitySyncManager<Prompt>({
			queryClient: this.queryClient!,
			subscriptionClient: this.subscriptionClient!,
			store,
			config: promptSyncConfig
		});

		this.entitySyncManager = entitySyncManager;

		if (clearExisting) {
			store.clearAllAt(promptSyncConfig.entityType);
		}

		if (initialItems.length > 0) {
			for (const item of initialItems) {
				const id = promptSyncConfig.getEntityId(item);
				if (id) {
					store.publish(toTopicPath(promptSyncConfig.entityType, id), item, { source: 'http' });
				}
			}
			if (setupSubscriptions) {
				entitySyncManager.setupCreateSubscription();
				entitySyncManager.setupSubscriptionsForEntities(initialItems);
			}
		} else if (setupSubscriptions) {
			entitySyncManager.setupCreateSubscription();
		}
	}

	protected doCleanup(): void {
		this.entitySyncManager?.cleanup();
		this.entitySyncManager = null;
	}

	protected async doRefetch(): Promise<void> {
		if (!this.entitySyncManager) return;
		await this.entitySyncManager.syncList({
			clearExisting: true,
			setupSubscriptions: true
		});
	}

	async syncList(options?: EntitySyncOptions): Promise<EntitySyncResult<Prompt>> {
		this.ensureReady();
		return this.runWithStatus(
			() => this.entitySyncManager!.syncList(options),
			'Failed to sync prompt list'
		);
	}

	async syncOne(id: string, options?: EntitySyncOptions): Promise<Prompt | null> {
		this.ensureReady();
		return this.runWithStatus(
			() => this.entitySyncManager!.syncOne(id, options),
			`Failed to sync prompt ${id}`
		);
	}

	get store() {
		return store;
	}
}
