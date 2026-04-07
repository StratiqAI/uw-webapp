import { browser } from '$app/environment';
import type { Project } from '@stratiqai/types-simple';
import { Q_LIST_PROJECTS, S_ON_CREATE_PROJECT, S_ON_DELETE_PROJECT, S_ON_UPDATE_PROJECT } from '@stratiqai/types-simple';
import { Q_GET_PROJECT } from '$lib/services/realtime/graphql/queries/Project';
import { validatedTopicStore } from '$lib/stores/validatedTopicStore';
import { EntitySyncManager } from '$lib/services/realtime/store/EntitySyncManager';
import type { EntitySyncOptions, EntitySyncResult } from '$lib/services/realtime/store/EntitySyncConfig';
import { createProjectSyncConfig } from '$lib/services/realtime/store/EntitySyncHelpers';
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

const projectSyncConfig = createProjectSyncConfig(
	Q_LIST_PROJECTS,
	Q_GET_PROJECT,
	S_ON_UPDATE_PROJECT,
	S_ON_DELETE_PROJECT,
	S_ON_CREATE_PROJECT
);

export interface ProjectManagerOptions extends BaseSyncManagerOptions {
	initialItems?: Project[];
	setupSubscriptions?: boolean;
	clearExisting?: boolean;
}

export class ProjectSyncManager extends BaseSyncManager {
	private entitySyncManager: EntitySyncManager<Project> | null = null;
	private lastOptions: ProjectManagerOptions | null = null;

	protected get managerName() {
		return 'ProjectSyncManager';
	}

	private constructor() {
		super();
	}

	static createInactive(): ProjectSyncManager {
		return new ProjectSyncManager();
	}

	static async create(options: ProjectManagerOptions): Promise<ProjectSyncManager> {
		const manager = new ProjectSyncManager();
		await manager.initialize(options);
		return manager;
	}

	protected async doInitialize(options: ProjectManagerOptions): Promise<void> {
		this.lastOptions = options;
		const {
			initialItems = [],
			setupSubscriptions = false,
			clearExisting = false
		} = options;

		const entitySyncManager = new EntitySyncManager<Project>({
			queryClient: this.queryClient!,
			subscriptionClient: this.subscriptionClient!,
			store,
			config: projectSyncConfig
		});

		this.entitySyncManager = entitySyncManager;

		if (clearExisting) {
			store.clearAllAt(projectSyncConfig.entityType);
		}

		if (initialItems.length > 0) {
			for (const item of initialItems) {
				const id = projectSyncConfig.getEntityId(item);
				if (id) {
					store.publish(toTopicPath(projectSyncConfig.entityType, id), item, { source: 'http' });
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
		this.lastOptions = null;
	}

	protected async doRefetch(): Promise<void> {
		if (!this.entitySyncManager) return;
		await this.entitySyncManager.syncList({
			clearExisting: true,
			setupSubscriptions: true
		});
	}

	async syncList(options?: EntitySyncOptions): Promise<EntitySyncResult<Project>> {
		this.ensureReady();
		return this.runWithStatus(
			() => this.entitySyncManager!.syncList(options),
			'Failed to sync project list'
		);
	}

	async syncOne(id: string, options?: EntitySyncOptions): Promise<Project | null> {
		this.ensureReady();
		return this.runWithStatus(
			() => this.entitySyncManager!.syncOne(id, options),
			`Failed to sync project ${id}`
		);
	}

	get store() {
		return store;
	}
}
