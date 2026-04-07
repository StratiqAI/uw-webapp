/**
 * DashboardSyncManager
 *
 * Manages a single DashboardLayout entity per project.
 * Extends BaseSyncManager for unified lifecycle, auto-reconnect refetch,
 * and shared WS client acquisition.
 *
 * Now publishes layout data to ValidatedTopicStore and uses SubscriptionSpec
 * pattern (addSubscription/removeSubscription) instead of raw subscribe().
 */

import type { DashboardLayout } from '@stratiqai/types-simple';
import {
	Q_LIST_DASHBOARD_LAYOUTS,
	M_CREATE_DASHBOARD_LAYOUT,
	M_UPDATE_DASHBOARD_LAYOUT,
	S_ON_CREATE_DASHBOARD_LAYOUT,
	S_ON_UPDATE_DASHBOARD_LAYOUT
} from '@stratiqai/types-simple';
import { validatedTopicStore } from '$lib/stores/validatedTopicStore';
import type { SubscriptionSpec } from '../types';
import { BaseSyncManager, type BaseSyncManagerOptions } from './BaseSyncManager';
import { createLogger } from '$lib/utils/logger';

const log = createLogger('sync');

export const store = validatedTopicStore;

function dashboardTopic(projectId: string): string {
	return `dashboards/${projectId}`;
}

export interface DashboardSyncManagerOptions extends BaseSyncManagerOptions {
	projectId: string;
}

export class DashboardSyncManager extends BaseSyncManager {
	private projectId: string | null = null;
	private layoutId: string | null = null;
	private updateSpec: SubscriptionSpec<any> | null = null;
	private createSpec: SubscriptionSpec<any> | null = null;

	private onRemoteUpdate: ((layout: DashboardLayout) => void) | null = null;

	protected get managerName() {
		return 'DashboardSyncManager';
	}

	private constructor() {
		super();
	}

	static createInactive(): DashboardSyncManager {
		return new DashboardSyncManager();
	}

	static async create(options: DashboardSyncManagerOptions): Promise<DashboardSyncManager> {
		const manager = new DashboardSyncManager();
		await manager.initialize(options);
		return manager;
	}

	protected async doInitialize(options: DashboardSyncManagerOptions): Promise<void> {
		const { projectId } = options;
		if (!projectId) throw new Error('DashboardSyncManager requires a projectId.');
		this.projectId = projectId;
	}

	protected doCleanup(): void {
		if (this.updateSpec && this.subscriptionClient) {
			this.subscriptionClient.removeSubscription(this.updateSpec);
		}
		if (this.createSpec && this.subscriptionClient) {
			this.subscriptionClient.removeSubscription(this.createSpec);
		}
		this.updateSpec = null;
		this.createSpec = null;
		this.onRemoteUpdate = null;
		this.layoutId = null;
		this.projectId = null;
	}

	protected async doRefetch(): Promise<void> {
		if (!this.projectId) return;
		const layout = await this.loadLayout();
		if (layout) {
			store.publish(dashboardTopic(this.projectId), layout, { source: 'http' });
		}
	}

	// ── Layout CRUD ───────────────────────────────────────────────────

	async loadLayout(): Promise<DashboardLayout | null> {
		this.ensureReady();

		const result = await this.queryClient!.query<{
			listDashboardLayouts: { items: DashboardLayout[]; nextToken: string | null };
		}>(Q_LIST_DASHBOARD_LAYOUTS, { parentId: this.projectId, limit: 1 });

		const items = result?.listDashboardLayouts?.items;
		if (items && items.length > 0) {
			this.layoutId = items[0].id;
			store.publish(dashboardTopic(this.projectId!), items[0], { source: 'http' });
			return items[0];
		}
		return null;
	}

	async createLayout(state: string, version: string): Promise<DashboardLayout> {
		this.ensureReady();

		const existing = await this.loadLayout();
		if (existing) {
			log.info('Layout already exists for project — updating instead of creating.');
			this.layoutId = existing.id;
			const updated = await this.queryClient!.query<{
				updateDashboardLayout: DashboardLayout;
			}>(M_UPDATE_DASHBOARD_LAYOUT, {
				key: { id: existing.id, parentId: this.projectId },
				input: { state, version }
			});
			const layout = updated?.updateDashboardLayout ?? existing;
			store.publish(dashboardTopic(this.projectId!), layout, { source: 'http' });
			return layout;
		}

		const result = await this.queryClient!.query<{
			createDashboardLayout: DashboardLayout;
		}>(M_CREATE_DASHBOARD_LAYOUT, {
			input: { parentId: this.projectId, state, version }
		});

		const layout = result?.createDashboardLayout;
		if (layout) {
			this.layoutId = layout.id;
			store.publish(dashboardTopic(this.projectId!), layout, { source: 'http' });
		}
		return layout;
	}

	async updateLayout(state: string, version: string): Promise<DashboardLayout | null> {
		this.ensureReady();
		if (!this.layoutId) {
			const existing = await this.loadLayout();
			if (existing) {
				this.layoutId = existing.id;
			} else {
				log.info('No layout exists — creating one.');
				return this.createLayout(state, version);
			}
		}

		const result = await this.queryClient!.query<{
			updateDashboardLayout: DashboardLayout;
		}>(M_UPDATE_DASHBOARD_LAYOUT, {
			key: { id: this.layoutId, parentId: this.projectId },
			input: { state, version }
		});

		const layout = result?.updateDashboardLayout ?? null;
		if (layout) {
			store.publish(dashboardTopic(this.projectId!), layout, { source: 'http' });
		}
		return layout;
	}

	// ── Subscriptions (using SubscriptionSpec pattern) ─────────────────

	setupUpdateSubscription(onUpdate: (layout: DashboardLayout) => void): void {
		if (!this.subscriptionClient || !this.layoutId) return;

		this.onRemoteUpdate = onUpdate;

		if (this.updateSpec) {
			this.subscriptionClient.removeSubscription(this.updateSpec);
		}

		this.updateSpec = {
			query: S_ON_UPDATE_DASHBOARD_LAYOUT,
			variables: { id: this.layoutId },
			path: 'onUpdateDashboardLayout',
			next: (layout: DashboardLayout) => {
				if (this.projectId) {
					store.publish(dashboardTopic(this.projectId), layout);
				}
				this.onRemoteUpdate?.(layout);
			},
			error: (err: unknown) => {
				log.error('Dashboard update subscription error:', err);
			}
		};

		this.subscriptionClient.addSubscription(this.updateSpec);
	}

	setupCreateSubscription(onCreate: (layout: DashboardLayout) => void): void {
		if (!this.subscriptionClient || !this.projectId) return;

		if (this.createSpec) {
			this.subscriptionClient.removeSubscription(this.createSpec);
		}

		this.createSpec = {
			query: S_ON_CREATE_DASHBOARD_LAYOUT,
			variables: { parentId: this.projectId },
			path: 'onCreateDashboardLayout',
			next: (layout: DashboardLayout) => {
				this.layoutId = layout.id;
				if (this.projectId) {
					store.publish(dashboardTopic(this.projectId), layout);
				}
				onCreate(layout);
			},
			error: (err: unknown) => {
				log.error('Dashboard create subscription error:', err);
			}
		};

		this.subscriptionClient.addSubscription(this.createSpec);
	}

	get currentLayoutId(): string | null {
		return this.layoutId;
	}

	set currentLayoutId(id: string | null) {
		this.layoutId = id;
	}
}
