import type { Widget, DashboardConfig } from '$lib/dashboard/types/widget';
import { mapStore } from '$lib/stores/MapStore';

const STORAGE_KEYS = {
	WIDGETS: 'dashboard_widgets',
	CONFIG: 'dashboard_config',
	WIDGET_DATA: 'dashboard_widget_data',
	VERSION: 'dashboard_version',
	SELECTED_PROJECT: 'dashboard_selected_project'
} as const;

function getProjectScopedKey(baseKey: string, projectId: string | null): string {
	if (!projectId) {
		return baseKey;
	}
	return `${baseKey}_project_${projectId}`;
}

const CURRENT_VERSION = '2.0.0'; // Bumped version to include widget data

export interface WidgetDataSnapshot {
	[channelId: string]: any;
}

export interface DashboardState {
	widgets: Widget[];
	config: DashboardConfig;
	widgetData: WidgetDataSnapshot;
	version: string;
}

// Auto-save configuration
let autoSaveWidgetDataEnabled = true;
let autoSaveWidgetDataTimeout: ReturnType<typeof setTimeout> | null = null;
const AUTO_SAVE_DELAY = 1000; // 1 second debounce

export class DashboardStorage {
	private static isLocalStorageAvailable(): boolean {
		try {
			const testKey = '__dashboard_test__';
			localStorage.setItem(testKey, 'test');
			localStorage.removeItem(testKey);
			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Enable or disable auto-save for widget data
	 */
	static setAutoSaveWidgetData(enabled: boolean): void {
		console.log(`🔧 [DashboardStorage] Auto-save widget data: ${enabled ? 'enabled' : 'disabled'}`);
		autoSaveWidgetDataEnabled = enabled;
	}

	/**
	 * Save only widget data (debounced)
	 * Called automatically when mapObjectStore data changes
	 */
	static autoSaveWidgetData(): void {
		if (!autoSaveWidgetDataEnabled) return;

		// Debounce to avoid excessive writes
		if (autoSaveWidgetDataTimeout) {
			clearTimeout(autoSaveWidgetDataTimeout);
		}

		autoSaveWidgetDataTimeout = setTimeout(() => {
			console.log('💾 [DashboardStorage] Auto-saving widget data...');
			this.saveWidgetDataOnly();
			autoSaveWidgetDataTimeout = null;
		}, AUTO_SAVE_DELAY);
	}

	/**
	 * Save only widget data (without full dashboard)
	 */
	private static saveWidgetDataOnly(): boolean {
		if (!this.isLocalStorageAvailable()) {
			return false;
		}

		try {
			// Capture current widget data from mapStore
			const allData = mapStore.getAllData();
			const widgetData: WidgetDataSnapshot = {};
			
			allData.forEach(item => {
				if (item.value !== undefined) {
					widgetData[item.typeId] = item.value; // typeId is actually topic name for compatibility
				}
			});

			localStorage.setItem(STORAGE_KEYS.WIDGET_DATA, JSON.stringify(widgetData));
			console.log(`   ✅ Auto-saved ${Object.keys(widgetData).length} channels`);

			return true;
		} catch (error) {
			console.error('❌ [DashboardStorage] Failed to auto-save widget data:', error);
			return false;
		}
	}

	static saveDashboard(widgets: Widget[], config: DashboardConfig, projectId: string | null = null): boolean {
		console.log(`\n💾 [DashboardStorage] Saving dashboard${projectId ? ` for project ${projectId}` : ''} to localStorage...`);
		
		if (!this.isLocalStorageAvailable()) {
			console.warn('LocalStorage is not available');
			return false;
		}

		try {
			// Capture current widget data from mapStore
			const allData = mapStore.getAllData();
			const widgetData: WidgetDataSnapshot = {};
			
			allData.forEach(item => {
				if (item.value !== undefined) {
					widgetData[item.typeId] = item.value; // typeId is actually topic name for compatibility
					console.log(`   ✅ Captured data for channel: ${item.typeId}`);
				}
			});

			console.log(`   Total channels saved: ${Object.keys(widgetData).length}`);

			const state: DashboardState = {
				widgets,
				config,
				widgetData,
				version: CURRENT_VERSION
			};

			const widgetsKey = getProjectScopedKey(STORAGE_KEYS.WIDGETS, projectId);
			const configKey = getProjectScopedKey(STORAGE_KEYS.CONFIG, projectId);
			const widgetDataKey = getProjectScopedKey(STORAGE_KEYS.WIDGET_DATA, projectId);
			const versionKey = getProjectScopedKey(STORAGE_KEYS.VERSION, projectId);

			localStorage.setItem(widgetsKey, JSON.stringify(widgets));
			localStorage.setItem(configKey, JSON.stringify(config));
			localStorage.setItem(widgetDataKey, JSON.stringify(widgetData));
			localStorage.setItem(versionKey, CURRENT_VERSION);

			// Save the selected project ID
			if (projectId !== null) {
				localStorage.setItem(STORAGE_KEYS.SELECTED_PROJECT, projectId);
			}

			console.log('✅ [DashboardStorage] Dashboard saved successfully\n');
			return true;
		} catch (error) {
			console.error('❌ [DashboardStorage] Failed to save dashboard to localStorage:', error);
			return false;
		}
	}

	static loadDashboard(projectId: string | null = null): DashboardState | null {
		const projectLabel = projectId ? ` for project ${projectId}` : '';
		console.log(`\n📂 [DashboardStorage] Loading dashboard${projectLabel} from localStorage...`);
		
		if (!this.isLocalStorageAvailable()) {
			console.warn('LocalStorage is not available');
			return null;
		}

		try {
			const widgetsKey = getProjectScopedKey(STORAGE_KEYS.WIDGETS, projectId);
			const configKey = getProjectScopedKey(STORAGE_KEYS.CONFIG, projectId);
			const widgetDataKey = getProjectScopedKey(STORAGE_KEYS.WIDGET_DATA, projectId);
			const versionKey = getProjectScopedKey(STORAGE_KEYS.VERSION, projectId);

			const version = localStorage.getItem(versionKey);

			// Check if stored version matches current version
			if (version !== CURRENT_VERSION) {
				console.info(`   Version mismatch (stored: ${version}, current: ${CURRENT_VERSION}), clearing old data`);
				this.clearDashboard(projectId);
				return null;
			}

			const widgetsJson = localStorage.getItem(widgetsKey);
			const configJson = localStorage.getItem(configKey);
			const widgetDataJson = localStorage.getItem(widgetDataKey);

			if (!widgetsJson || !configJson) {
				console.log('   No saved dashboard found');
				return null;
			}

			const widgets = JSON.parse(widgetsJson) as Widget[];
			const config = JSON.parse(configJson) as DashboardConfig;
			const widgetData = widgetDataJson ? JSON.parse(widgetDataJson) as WidgetDataSnapshot : {};

			// Validate loaded data
			if (!Array.isArray(widgets) || !config.gridColumns || !config.gridRows) {
				console.error('Invalid dashboard data in localStorage');
				return null;
			}

			console.log(`   ✅ Loaded ${widgets.length} widgets`);
			console.log(`   ✅ Loaded ${Object.keys(widgetData).length} widget data channels`);

			// Restore widget data to mapObjectStore
			this.restoreWidgetData(widgetData);

			return {
				widgets,
				config,
				widgetData,
				version: CURRENT_VERSION
			};
		} catch (error) {
			console.error('❌ [DashboardStorage] Failed to load dashboard from localStorage:', error);
			return null;
		}
	}

	static getSelectedProjectId(): string | null {
		if (!this.isLocalStorageAvailable()) {
			return null;
		}
		return localStorage.getItem(STORAGE_KEYS.SELECTED_PROJECT);
	}

	/**
	 * Restore widget data to mapStore
	 */
	private static restoreWidgetData(widgetData: WidgetDataSnapshot): void {
		console.log('\n📤 [DashboardStorage] Restoring widget data to mapStore...');
		
		Object.entries(widgetData).forEach(([topic, data]) => {
			try {
				// Create a temporary publisher to restore the data
				const publisher = mapStore.getPublisher(
					topic,
					'dashboard-storage-restore'
				);
				
				publisher.publish(data);
				console.log(`   ✅ Restored data for topic: ${topic}`);
				
				// Dispose the temporary publisher
				publisher.dispose();
			} catch (error) {
				console.error(`   ❌ Failed to restore data for topic ${topic}:`, error);
			}
		});

		console.log('✅ [DashboardStorage] Widget data restoration complete\n');
	}

	static clearDashboard(projectId: string | null = null): boolean {
		const projectLabel = projectId ? ` for project ${projectId}` : '';
		console.log(`\n🗑️  [DashboardStorage] Clearing dashboard${projectLabel} from localStorage...`);
		
		if (!this.isLocalStorageAvailable()) {
			return false;
		}

		try {
			const widgetsKey = getProjectScopedKey(STORAGE_KEYS.WIDGETS, projectId);
			const configKey = getProjectScopedKey(STORAGE_KEYS.CONFIG, projectId);
			const widgetDataKey = getProjectScopedKey(STORAGE_KEYS.WIDGET_DATA, projectId);
			const versionKey = getProjectScopedKey(STORAGE_KEYS.VERSION, projectId);

			localStorage.removeItem(widgetsKey);
			localStorage.removeItem(configKey);
			localStorage.removeItem(widgetDataKey);
			localStorage.removeItem(versionKey);
			
			console.log('✅ [DashboardStorage] Dashboard cleared\n');
			return true;
		} catch (error) {
			console.error('❌ [DashboardStorage] Failed to clear dashboard from localStorage:', error);
			return false;
		}
	}

	static exportDashboard(projectId: string | null = null): string | null {
		const state = this.loadDashboard(projectId);
		if (!state) return null;

		try {
			return JSON.stringify(state, null, 2);
		} catch (error) {
			console.error('Failed to export dashboard:', error);
			return null;
		}
	}

	static importDashboard(jsonString: string, projectId: string | null = null): boolean {
		try {
			const state = JSON.parse(jsonString) as DashboardState;

			if (!state.widgets || !state.config) {
				throw new Error('Invalid dashboard data structure');
			}

			return this.saveDashboard(state.widgets, state.config, projectId);
		} catch (error) {
			console.error('Failed to import dashboard:', error);
			return false;
		}
	}
}
