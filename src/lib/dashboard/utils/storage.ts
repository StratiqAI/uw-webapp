import type { Widget, DashboardConfig } from '$lib/dashboard/types/widget';
import {
	createEmptyMultiTabState,
	createEmptyTabSlice,
	DEFAULT_TABS,
	type DashboardTabId,
	type MultiTabDashboardState,
	type TabDashboardSlice,
	type TabInfo,
	type WidgetDataSnapshot as TabWidgetDataSnapshot
} from '$lib/dashboard/types/dashboardTabs';
import { validatedTopicStore } from '$lib/stores/validatedTopicStore';
import type { DashboardLayout } from '@stratiqai/types-simple';
import type { DashboardSyncManager } from '$lib/services/realtime/websocket/sync-managers/DashboardSyncManager';
import { createLogger } from '$lib/utils/logger';

const log = createLogger('dashboard');

const STORAGE_KEYS = {
	WIDGETS: 'dashboard_widgets',
	CONFIG: 'dashboard_config',
	WIDGET_DATA: 'dashboard_widget_data',
	VERSION: 'dashboard_version',
	WORKSPACE: 'dashboard_workspace',
	SELECTED_PROJECT: 'dashboard_selected_project'
} as const;

const VERSION_LEGACY_V3 = '3.0.0';
const VERSION_V4 = '4.0.0';
export const DASHBOARD_STORAGE_VERSION = '5.0.0';

function getProjectScopedKey(baseKey: string, projectId: string | null): string {
	if (!projectId) return baseKey;
	return `${baseKey}_project_${projectId}`;
}

/** @deprecated Legacy single-dashboard payload */
export interface DashboardState {
	widgets: Widget[];
	config: DashboardConfig;
	widgetData: WidgetDataSnapshot;
	version: string;
}

export type WidgetDataSnapshot = TabWidgetDataSnapshot;

let autoSaveWidgetDataEnabled = true;
let autoSaveWidgetDataTimeout: ReturnType<typeof setTimeout> | null = null;
const AUTO_SAVE_DELAY = 1000;

function isValidTabSlice(s: unknown): s is TabDashboardSlice {
	if (!s || typeof s !== 'object') return false;
	const o = s as Record<string, unknown>;
	if (!Array.isArray(o.widgets)) return false;
	if (!o.config || typeof o.config !== 'object') return false;
	if (o.widgetData !== undefined && (typeof o.widgetData !== 'object' || o.widgetData === null)) return false;
	return true;
}

function isValidMultiTabState(data: unknown): data is MultiTabDashboardState {
	if (!data || typeof data !== 'object') return false;
	const o = data as Record<string, unknown>;
	if (o.version !== DASHBOARD_STORAGE_VERSION) return false;
	if (typeof o.activeTabId !== 'string') return false;
	if (!Array.isArray(o.tabOrder)) return false;
	const tabOrder = o.tabOrder as unknown[];
	for (const t of tabOrder) {
		if (!t || typeof t !== 'object') return false;
		const ti = t as Record<string, unknown>;
		if (typeof ti.id !== 'string' || typeof ti.label !== 'string') return false;
	}
	if (!o.tabs || typeof o.tabs !== 'object') return false;
	const tabs = o.tabs as Record<string, unknown>;
	for (const t of tabOrder as TabInfo[]) {
		if (!isValidTabSlice(tabs[t.id])) return false;
	}
	if (!(o.activeTabId as string) || !tabOrder.some((t: any) => t.id === o.activeTabId)) return false;
	if (o.cloudLayoutId !== undefined && typeof o.cloudLayoutId !== 'string') return false;
	return true;
}

const V4_TAB_IDS = ['financial', 'market', 'property', 'legal'];
const V4_TAB_LABELS: Record<string, string> = {
	financial: 'Financial',
	market: 'Market',
	property: 'Property',
	legal: 'Legal'
};

function migrateV4ToV5(v4: Record<string, unknown>): MultiTabDashboardState | null {
	if (typeof v4.activeTabId !== 'string' || !v4.tabs || typeof v4.tabs !== 'object') return null;
	const tabs = v4.tabs as Record<string, unknown>;
	const tabOrder: TabInfo[] = [];
	const newTabs: Record<DashboardTabId, TabDashboardSlice> = {};
	for (const id of V4_TAB_IDS) {
		const slice = tabs[id];
		if (isValidTabSlice(slice)) {
			tabOrder.push({ id, label: V4_TAB_LABELS[id] ?? id });
			newTabs[id] = slice;
		}
	}
	if (tabOrder.length === 0) return null;
	const activeTabId = tabOrder.some((t) => t.id === v4.activeTabId) ? (v4.activeTabId as string) : tabOrder[0].id;
	return { version: DASHBOARD_STORAGE_VERSION, activeTabId, tabOrder, tabs: newTabs };
}

function migrateLegacyV3ToMulti(legacy: {
	widgets: Widget[];
	config: DashboardConfig;
	widgetData: WidgetDataSnapshot;
}): MultiTabDashboardState {
	const state = createEmptyMultiTabState('market');
	state.tabs.market = {
		widgets: legacy.widgets,
		config: legacy.config,
		widgetData: legacy.widgetData ?? {}
	};
	return state;
}

function tryParseLegacyV3(projectId: string | null): MultiTabDashboardState | null {
	const widgetsKey = getProjectScopedKey(STORAGE_KEYS.WIDGETS, projectId);
	const configKey = getProjectScopedKey(STORAGE_KEYS.CONFIG, projectId);
	const widgetDataKey = getProjectScopedKey(STORAGE_KEYS.WIDGET_DATA, projectId);
	const versionKey = getProjectScopedKey(STORAGE_KEYS.VERSION, projectId);

	const version = localStorage.getItem(versionKey);
	if (version !== VERSION_LEGACY_V3 && version !== null) return null;

	const widgetsJson = localStorage.getItem(widgetsKey);
	const configJson = localStorage.getItem(configKey);
	if (!widgetsJson || !configJson) return null;

	let widgets: unknown;
	try { widgets = JSON.parse(widgetsJson); } catch { return null; }
	if (!Array.isArray(widgets)) return null;

	const config = JSON.parse(configJson) as DashboardConfig;
	if (!config?.gridColumns || !config?.gridRows) return null;

	const widgetDataJson = localStorage.getItem(widgetDataKey);
	const widgetData = widgetDataJson ? (JSON.parse(widgetDataJson) as WidgetDataSnapshot) : {};

	log.info('   📦 Migrating v3 → v5 (layout → Market tab)');
	const migrated = migrateLegacyV3ToMulti({ widgets: widgets as Widget[], config, widgetData });
	DashboardStorage.saveMultiTabState(migrated, projectId);
	DashboardStorage.removeLegacyV3Keys(projectId);
	return migrated;
}

export class DashboardStorage {
	private static isLocalStorageAvailable(): boolean {
		try {
			const testKey = '__dashboard_test__';
			localStorage.setItem(testKey, 'test');
			localStorage.removeItem(testKey);
			return true;
		} catch { return false; }
	}

	static setAutoSaveWidgetData(enabled: boolean): void {
		autoSaveWidgetDataEnabled = enabled;
	}

	static autoSaveWidgetData(): void {
		if (!autoSaveWidgetDataEnabled) return;
		if (autoSaveWidgetDataTimeout) clearTimeout(autoSaveWidgetDataTimeout);
		autoSaveWidgetDataTimeout = setTimeout(() => {
			this.saveWidgetDataOnly();
			autoSaveWidgetDataTimeout = null;
		}, AUTO_SAVE_DELAY);
	}

	static saveWidgetDataNow(): boolean {
		if (!autoSaveWidgetDataEnabled) return false;
		return this.saveWidgetDataOnly();
	}

	private static saveWidgetDataOnly(): boolean {
		if (!this.isLocalStorageAvailable()) return false;
		try {
			const widgetData = this.collectWidgetDataFromStore();
			localStorage.setItem(STORAGE_KEYS.WIDGET_DATA, JSON.stringify(widgetData));
			return true;
		} catch { return false; }
	}

	static collectWidgetDataFromStore(): WidgetDataSnapshot {
		const widgetData: WidgetDataSnapshot = {};
		const tree = validatedTopicStore.tree;
		if (tree.widgets && typeof tree.widgets === 'object') {
			for (const [widgetType, widgetTypeData] of Object.entries(tree.widgets)) {
				if (widgetTypeData && typeof widgetTypeData === 'object') {
					for (const [widgetId, data] of Object.entries(widgetTypeData)) {
						widgetData[`widgets/${widgetType}/${widgetId}`] = data;
					}
				}
			}
		}
		return widgetData;
	}

	static saveMultiTabState(state: MultiTabDashboardState, projectId: string | null = null): boolean {
		if (!this.isLocalStorageAvailable()) return false;
		try {
			const workspaceKey = getProjectScopedKey(STORAGE_KEYS.WORKSPACE, projectId);
			const versionKey = getProjectScopedKey(STORAGE_KEYS.VERSION, projectId);
			localStorage.setItem(workspaceKey, JSON.stringify(state));
			localStorage.setItem(versionKey, DASHBOARD_STORAGE_VERSION);
			if (projectId !== null) localStorage.setItem(STORAGE_KEYS.SELECTED_PROJECT, projectId);
			return true;
		} catch { return false; }
	}

	static loadDashboard(projectId: string | null = null): MultiTabDashboardState | null {
		if (!this.isLocalStorageAvailable()) return null;
		try {
			const versionKey = getProjectScopedKey(STORAGE_KEYS.VERSION, projectId);
			const workspaceKey = getProjectScopedKey(STORAGE_KEYS.WORKSPACE, projectId);
			const version = localStorage.getItem(versionKey);

			if (version === DASHBOARD_STORAGE_VERSION) {
				const json = localStorage.getItem(workspaceKey);
				if (!json) return null;
				const parsed = JSON.parse(json) as unknown;
				if (isValidMultiTabState(parsed)) return parsed;
				this.clearDashboard(projectId);
				return null;
			}

			if (version === VERSION_V4) {
				const json = localStorage.getItem(workspaceKey);
				if (json) {
					const parsed = JSON.parse(json) as Record<string, unknown>;
					const migrated = migrateV4ToV5(parsed);
					if (migrated) {
						log.info('   📦 Migrated v4 → v5');
						this.saveMultiTabState(migrated, projectId);
						return migrated;
					}
				}
			}

			if (version === VERSION_LEGACY_V3 || version === null) {
				const migrated = tryParseLegacyV3(projectId);
				if (migrated) return migrated;
			}

			if (version !== null && version !== VERSION_LEGACY_V3) {
				this.clearDashboard(projectId);
			}

			return null;
		} catch { return null; }
	}

	static restoreWidgetDataSnapshot(widgetData: WidgetDataSnapshot, options?: { force?: boolean }): void {
		const force = options?.force ?? false;
		Object.entries(widgetData).forEach(([topic, data]) => {
			try {
				if (!force && validatedTopicStore.at(topic) !== undefined) return;
				validatedTopicStore.publish(topic, data);
			} catch { /* skip */ }
		});
	}

	static getSelectedProjectId(): string | null {
		if (!this.isLocalStorageAvailable()) return null;
		return localStorage.getItem(STORAGE_KEYS.SELECTED_PROJECT);
	}

	static removeLegacyV3Keys(projectId: string | null): void {
		for (const key of [STORAGE_KEYS.WIDGETS, STORAGE_KEYS.CONFIG, STORAGE_KEYS.WIDGET_DATA]) {
			localStorage.removeItem(getProjectScopedKey(key, projectId));
		}
	}

	static clearDashboard(projectId: string | null = null): boolean {
		if (!this.isLocalStorageAvailable()) return false;
		try {
			for (const key of Object.values(STORAGE_KEYS)) {
				if (key === STORAGE_KEYS.SELECTED_PROJECT) continue;
				localStorage.removeItem(getProjectScopedKey(key, projectId));
			}
			return true;
		} catch { return false; }
	}

	static exportDashboard(projectId: string | null = null): string | null {
		const state = this.loadDashboard(projectId);
		if (!state) return null;
		try { return JSON.stringify(state, null, 2); } catch { return null; }
	}

	static importDashboard(jsonString: string, projectId: string | null = null): boolean {
		try {
			const parsed = JSON.parse(jsonString) as unknown;
			if (isValidMultiTabState(parsed)) return this.saveMultiTabState(parsed, projectId);

			const asV4 = parsed as Record<string, unknown>;
			if (asV4.version === VERSION_V4) {
				const migrated = migrateV4ToV5(asV4);
				if (migrated) return this.saveMultiTabState(migrated, projectId);
			}

			const legacy = parsed as Partial<DashboardState>;
			if (legacy.widgets && legacy.config && Array.isArray(legacy.widgets)) {
				const multi = migrateLegacyV3ToMulti({
					widgets: legacy.widgets,
					config: legacy.config as DashboardConfig,
					widgetData: (legacy.widgetData as WidgetDataSnapshot) ?? {}
				});
				return this.saveMultiTabState(multi, projectId);
			}

			return false;
		} catch { return false; }
	}

	// ─── Cloud Sync Methods ─────────────────────────────────────────

	/**
	 * Parse `DashboardLayout.state` from AppSync (AWSJSON may arrive as a string or parsed object).
	 */
	static parseRemoteLayoutState(state: unknown): MultiTabDashboardState | null {
		if (state == null) return null;
		let parsed: unknown;
		if (typeof state === 'string') {
			const s = state.trim();
			if (!s) return null;
			try {
				parsed = JSON.parse(s);
			} catch {
				return null;
			}
		} else if (typeof state === 'object') {
			parsed = state;
		} else {
			return null;
		}
		return isValidMultiTabState(parsed) ? parsed : null;
	}

	/**
	 * Load the dashboard layout from the cloud.
	 * Returns null if there is no cloud entity. If the entity exists but JSON/state is invalid,
	 * still returns `layoutId` so the UI can show which record exists.
	 */
	static async loadFromCloud(
		syncManager: DashboardSyncManager,
		projectId: string
	): Promise<{ layoutId: string; state: MultiTabDashboardState | null } | null> {
		try {
			const cloudLayout = await syncManager.loadLayout();
			if (!cloudLayout?.id) return null;

			const raw = cloudLayout.state;
			if (raw == null || raw === '') {
				return { layoutId: cloudLayout.id, state: null };
			}

			let cloudState: unknown;
			try {
				cloudState = typeof raw === 'string' ? JSON.parse(raw) : raw;
			} catch {
				log.warn('[DashboardStorage] Cloud layout state is not valid JSON');
				return { layoutId: cloudLayout.id, state: null };
			}

			if (!isValidMultiTabState(cloudState)) {
				log.warn('[DashboardStorage] Cloud state failed validation');
				return { layoutId: cloudLayout.id, state: null };
			}

			return { layoutId: cloudLayout.id, state: cloudState };
		} catch (err) {
			log.error('[DashboardStorage] Failed to load from cloud:', err);
			return null;
		}
	}

	/**
	 * Save the dashboard state to the cloud via the sync manager.
	 * Write-through: localStorage is written synchronously by the caller,
	 * this handles the async AppSync mutation.
	 */
	static async saveToCloud(
		syncManager: DashboardSyncManager,
		state: MultiTabDashboardState
	): Promise<DashboardLayout | null> {
		try {
			const stateJson = JSON.stringify(state);
			const result = await syncManager.updateLayout(stateJson, DASHBOARD_STORAGE_VERSION);
			return result;
		} catch (err) {
			log.error('[DashboardStorage] Failed to save to cloud:', err);
			return null;
		}
	}

	/**
	 * Ensure a cloud layout exists for this project.
	 * If one already exists, update it; otherwise create a new one.
	 */
	static async migrateToCloud(
		syncManager: DashboardSyncManager,
		state: MultiTabDashboardState
	): Promise<DashboardLayout | null> {
		try {
			const existing = await syncManager.loadLayout();
			const stateJson = JSON.stringify(state);

			if (existing) {
				log.info('[DashboardStorage] Cloud layout already exists — updating instead of creating');
				const updated = await syncManager.updateLayout(stateJson, DASHBOARD_STORAGE_VERSION);
				return updated ?? existing;
			}

			const layout = await syncManager.createLayout(stateJson, DASHBOARD_STORAGE_VERSION);
			log.info('[DashboardStorage] Created cloud layout for project');
			return layout;
		} catch (err) {
			log.error('[DashboardStorage] Failed to migrate to cloud:', err);
			return null;
		}
	}

	/**
	 * Reconcile cloud layout with localStorage. Cloud wins if it has a newer updatedAt.
	 * Returns the winning state (may be the existing local state).
	 */
	static reconcileWithCloud(
		localState: MultiTabDashboardState | null,
		cloudLayout: DashboardLayout,
		projectId: string
	): MultiTabDashboardState | null {
		try {
			const cloudState = JSON.parse(cloudLayout.state as string) as unknown;
			if (!isValidMultiTabState(cloudState)) return localState;

			// Cloud always wins in v1 (last-write-wins).
			// Future: compare updatedAt timestamps for smarter merging.
			const withLayoutId: MultiTabDashboardState = {
				...(cloudState as MultiTabDashboardState),
				cloudLayoutId: cloudLayout.id
			};
			this.saveMultiTabState(withLayoutId, projectId);
			return withLayoutId;
		} catch {
			return localState;
		}
	}
}
