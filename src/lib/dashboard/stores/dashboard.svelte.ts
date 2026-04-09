import type {
	Widget,
	DashboardConfig,
	DragState,
	ResizeState,
	Position
} from '$lib/dashboard/types/widget';
import { DEFAULT_DASHBOARD_CONFIG } from '$lib/dashboard/types/widget';
import {
	createEmptyMultiTabState,
	createEmptyTabSlice,
	DEFAULT_TABS,
	DEFAULT_ACTIVE_TAB,
	generateTabId,
	type DashboardTabId,
	type MultiTabDashboardState,
	type TabDashboardSlice,
	type TabInfo
} from '$lib/dashboard/types/dashboardTabs';
import { DASHBOARD_STORAGE_VERSION } from '$lib/dashboard/utils/storage';
import { getWidgetStructuralHash } from '$lib/dashboard/setup/widgetSchemaRegistration';
import { toOntologyInstDataTopic } from '$lib/services/realtime/store/ontologyClientHelpers';
import { isValidPosition, findAvailablePosition, resolveCollisions, repairOverlaps } from '$lib/dashboard/utils/grid';
import type { WidgetRect } from '$lib/dashboard/utils/grid';
import { DashboardStorage } from '$lib/dashboard/utils/storage';
import { generateWidgetId } from '$lib/dashboard/utils/idGenerator';
import { validatedTopicStore } from '$lib/stores/validatedTopicStore';
import { globalProjectStore } from '$lib/stores/globalProjectStore.svelte';
import type { DashboardLayout } from '@stratiqai/types-simple';
import {
	Q_LIST_DASHBOARD_LAYOUTS,
	M_CREATE_DASHBOARD_LAYOUT,
	M_UPDATE_DASHBOARD_LAYOUT
} from '@stratiqai/types-simple';
import { gql } from '$lib/services/realtime/graphql/requestHandler';
import { createLogger } from '$lib/utils/logger';

const log = createLogger('dashboard');

const DEFAULT_CONFIG: DashboardConfig = structuredClone(DEFAULT_DASHBOARD_CONFIG);

function cloneEmptyMultiTab(): MultiTabDashboardState {
	return structuredClone(createEmptyMultiTabState());
}

function resolveWidgetTopic(w: Widget, projectId: string | null): string {
	if (w.topicOverride) return w.topicOverride;
	const hash = getWidgetStructuralHash(w.type);
	if (w.entityInstanceId && hash && projectId) {
		return toOntologyInstDataTopic(projectId, hash, w.entityInstanceId);
	}
	return `widgets/${w.type}/${w.id}`;
}

function clearWidgetTopicsForLayout(widgets: Widget[], projectId: string | null): void {
	for (const w of widgets) {
		validatedTopicStore.delete(resolveWidgetTopic(w, projectId));
	}
}

const DEFAULT_DRAG_STATE: DragState = {
	isDragging: false,
	activeWidgetId: null,
	ghostPosition: null,
	dragCellOffset: null
} as const;

const DEFAULT_RESIZE_STATE: ResizeState = {
	isResizing: false,
	activeWidgetId: null,
	resizeHandle: null
} as const;

const GRID_BUFFER_ROWS = 2;
const AUTO_SAVE_DELAY_MS = 1000;
const UNDO_STACK_LIMIT = 40;
const CLOUD_SAVE_DEBOUNCE_MS = 1200;
const AUTOSAVE_CLOUD_KEY = 'dashboard_autosave_cloud';

type LayoutSnapshot = Array<{
	id: string;
	gridColumn: number;
	gridRow: number;
	colSpan: number;
	rowSpan: number;
}>;

// Custom error classes for better error handling
class DashboardError extends Error {
	constructor(message: string, public readonly code: string) {
		super(message);
		this.name = 'DashboardError';
	}
}

// Types for better type safety
type WidgetUpdate = Partial<Omit<Widget, 'id'>>;
type GridPosition = Pick<Widget, 'gridColumn' | 'gridRow' | 'colSpan' | 'rowSpan'>;

interface DashboardEvents {
	'widget:added': Widget;
	'widget:removed': string;
	'widget:updated': { id: string; updates: WidgetUpdate };
	'dashboard:saved': void;
	'dashboard:loaded': void;
	'dashboard:reset': void;
	'grid:expanded': { rows: number; columns: number };
}

class DashboardStore {
	// State using Svelte 5 runes
	#widgets = $state.raw<Widget[]>([]);
	#widgetZIndexMap = $state<Map<string, number>>(new Map());
	#config = $state.raw<DashboardConfig>(structuredClone(DEFAULT_CONFIG));
	#dragState = $state<DragState>(structuredClone(DEFAULT_DRAG_STATE));
	#resizeState = $state<ResizeState>(structuredClone(DEFAULT_RESIZE_STATE));
	#fullscreenWidgetId = $state<string | null>(null);
	#displacementPreview = $state.raw<Record<string, Position>>({});
	
	// Settings
	#autoSaveEnabled = $state(true);
	#autoSaveWidgetData = $state(true);
	#devMode = $state(false);
	#hasUnsavedChanges = $state(false);
	#projectId = $state<string | null>(null);
	#activeTabId = $state<DashboardTabId>(DEFAULT_ACTIVE_TAB);
	#tabOrder = $state.raw<TabInfo[]>(structuredClone(DEFAULT_TABS) as TabInfo[]);
	#tabSlices = $state.raw<Record<DashboardTabId, TabDashboardSlice>>(cloneEmptyMultiTab().tabs);
	
	// Private state
	#initialized = $state(false);
	#nextZIndex = 1;
	#autoSaveTimeout: ReturnType<typeof setTimeout> | null = null;
	#eventListeners = new Map<keyof DashboardEvents, Set<Function>>();
	#suspendAutoSave = false;

	// Guards overlapping initialize() calls across project switches
	#initGeneration = 0;

	// Cloud sync state (direct GraphQL, no sync manager)
	#idToken: string | null = null;
	#cloudLayoutId = $state<string | null>(null);
	#cloudSaveTimeout: ReturnType<typeof setTimeout> | null = null;
	#cloudSyncStatus: 'idle' | 'saving' | 'saved' | 'error' = $state('idle');
	#autoSaveToCloud = $state(true);

	// Undo / redo stacks (layout-only snapshots — lightweight)
	#undoStack: LayoutSnapshot[] = [];
	#redoStack: LayoutSnapshot[] = [];

	/**
	 * Expose $state via $derived so Svelte components subscribe when reading `dashboard.widgets`, etc.
	 * Plain getters do not reliably establish template reactivity for class-based runes (Svelte 5).
	 */
	widgets = $derived(this.#widgets);
	config = $derived(this.#config);
	dragState = $derived(this.#dragState);
	resizeState = $derived(this.#resizeState);
	hasUnsavedChanges = $derived(this.#hasUnsavedChanges);
	autoSaveEnabled = $derived(this.#autoSaveEnabled);
	devMode = $derived(this.#devMode);
	projectId = $derived(this.#projectId);
	activeTabId = $derived(this.#activeTabId);
	tabOrder = $derived(this.#tabOrder);
	fullscreenWidgetId = $derived(this.#fullscreenWidgetId);
	displacementPreview = $derived(this.#displacementPreview);
	cloudSyncStatus = $derived(this.#cloudSyncStatus);
	autoSaveToCloud = $derived(this.#autoSaveToCloud);
	get idToken(): string | null { return this.#idToken; }
	get tabIds(): DashboardTabId[] { return this.#tabOrder.map(t => t.id); }
	get isInitialized() { return this.#initialized; }
	get canUndo(): boolean { return this.#undoStack.length > 0; }
	get canRedo(): boolean { return this.#redoStack.length > 0; }
	
	// Derived state with memoization
	activeWidget = $derived.by(() => {
		const id = this.#dragState.activeWidgetId || this.#resizeState.activeWidgetId;
		return id ? this.#widgets.find((w) => w.id === id) : null;
	});
	
	occupiedCells = $derived.by(() => this.#computeOccupiedCells());
	
	availableSpace = $derived.by(() => {
		const total = this.#config.gridRows * this.#config.gridColumns;
		const occupied = this.occupiedCells.size;
		return {
			total,
			occupied,
			free: total - occupied,
			percentage: ((total - occupied) / total) * 100
		};
	});

	/** True when the active tab has at least one widget and every widget is locked. */
	allWidgetsLocked = $derived.by(() => {
		const w = this.#widgets;
		return w.length > 0 && w.every((x) => x.locked === true);
	});

	constructor() {
		// Bind methods to preserve context
		this.initialize = this.initialize.bind(this);
		this.save = this.save.bind(this);
	}
	
	// Initialization
	async initialize(projectId: string | null = null, idToken: string | null = null): Promise<boolean> {
		if (this.#initialized && this.#projectId === projectId) {
			if (idToken) this.#idToken = idToken;
			if (projectId) globalProjectStore.setSelectedProjectId(projectId);
			return true;
		}

		// Invalidate any in-flight initialize() from a previous call
		const gen = ++this.#initGeneration;
		
		// If switching projects, save current dashboard first
		if (this.#initialized && this.#projectId !== projectId && this.#hasUnsavedChanges) {
			this.save();
		}
		
		// Clear all VTS widget topics to prevent stale data from previous project
		validatedTopicStore.clearAllAt('widgets');

		// Reset state for new project
		this.#widgets = [];
		this.#widgetZIndexMap.clear();
		this.#fullscreenWidgetId = null;
		this.#nextZIndex = 1;
		this.#hasUnsavedChanges = false;
		this.#projectId = projectId;
		this.#idToken = idToken;
		this.#cloudLayoutId = null;
		this.#cloudSyncStatus = 'idle';
		if (projectId) {
			globalProjectStore.setSelectedProjectId(projectId);
		}
		this.#initialized = false;
		this.#activeTabId = DEFAULT_ACTIVE_TAB;
		const fresh = cloneEmptyMultiTab();
		this.#tabOrder = fresh.tabOrder;
		this.#tabSlices = fresh.tabs;

		// Restore autosave preference from localStorage
		try {
			const stored = localStorage.getItem(AUTOSAVE_CLOUD_KEY);
			if (stored !== null) this.#autoSaveToCloud = stored !== 'false';
		} catch { /* ignore */ }
		
		try {
			DashboardStorage.setAutoSaveWidgetData(this.#autoSaveWidgetData);
			
			if (this.#devMode) {
				this.#applyTabSlice(fresh.tabs[DEFAULT_ACTIVE_TAB]);
				this.#initialized = true;
				log.info('Dashboard initialized in dev mode (localStorage disabled)');
				return false;
			}
			
			// Load from localStorage first (instant render)
			const savedState = DashboardStorage.loadDashboard(projectId);
			if (savedState) {
				this.#loadFromSavedState(savedState);
				this.#emit('dashboard:loaded', undefined);
			} else {
				this.#applyTabSlice(fresh.tabs[DEFAULT_ACTIVE_TAB]);
				this.#initialized = true;
			}

			// Then fetch from GraphQL and overwrite if cloud has data
			if (projectId && idToken) {
				try {
					const cloudState = await this.#loadFromGraphQL(projectId);
					if (gen !== this.#initGeneration) return false;
					if (cloudState) {
						this.#loadFromSavedState(cloudState);
						DashboardStorage.saveMultiTabState(cloudState, projectId);
						this.#emit('dashboard:loaded', undefined);
						log.info('Loaded dashboard from cloud');
					} else if (savedState) {
						await this.#createCloudLayout(savedState);
						if (gen !== this.#initGeneration) return false;
					} else {
						await this.#createCloudLayout(this.#snapshotMultiTabState());
						if (gen !== this.#initGeneration) return false;
					}
				} catch (err) {
					log.error('Cloud load failed, using local state:', err);
				}
			}

			return !!savedState;
		} catch (error) {
			log.error('Failed to initialize dashboard:', error);
			this.#initialized = true;
			return false;
		}
	}

	setAutoSaveToCloud(enabled: boolean): void {
		this.#autoSaveToCloud = enabled;
		try { localStorage.setItem(AUTOSAVE_CLOUD_KEY, String(enabled)); } catch { /* ignore */ }
	}

	cloudLayoutId = $derived(this.#cloudLayoutId);
	
	// Save operations
	save(): boolean {
		if (this.#devMode) {
			log.info('Dashboard save skipped (dev mode)');
			return false;
		}
		
		try {
			const state = this.#snapshotMultiTabState();

			// Synchronous localStorage write (instant)
			const success = DashboardStorage.saveMultiTabState(state, this.#projectId);
			if (success) {
				this.#hasUnsavedChanges = false;
				this.#emit('dashboard:saved', undefined);
			}

			// Debounced cloud save when autosave is on
			if (this.#autoSaveToCloud && this.#idToken && this.#projectId) {
				this.#scheduleCloudSave(state);
			}

			return success;
		} catch (error) {
			log.error('Failed to save dashboard:', error);
			return false;
		}
	}

	/**
	 * Immediately save the current dashboard state to the cloud (non-debounced).
	 * Also writes to localStorage first.
	 */
	async syncToCloud(): Promise<boolean> {
		if (!this.#idToken || !this.#projectId) return false;

		if (this.#cloudSaveTimeout) {
			clearTimeout(this.#cloudSaveTimeout);
			this.#cloudSaveTimeout = null;
		}

		this.#cloudSyncStatus = 'saving';
		try {
			const state = this.#snapshotMultiTabState();

			DashboardStorage.saveMultiTabState(state, this.#projectId);
			this.#hasUnsavedChanges = false;

			const layout = await this.#saveToGraphQL(state);
			if (layout) {
				this.#cloudSyncStatus = 'saved';
				return true;
			}

			this.#cloudSyncStatus = 'error';
			return false;
		} catch (err) {
			log.error('Manual cloud sync failed:', err);
			this.#cloudSyncStatus = 'error';
			return false;
		}
	}

	/**
	 * Clear this project's dashboard keys in localStorage, then load the latest layout from GraphQL.
	 * Returns true if a cloud layout existed; false if none.
	 */
	async reloadFromCloud(): Promise<boolean> {
		if (!this.#idToken || !this.#projectId) return false;

		const projectId = this.#projectId;

		if (this.#cloudSaveTimeout) {
			clearTimeout(this.#cloudSaveTimeout);
			this.#cloudSaveTimeout = null;
		}

		this.#cloudSyncStatus = 'saving';

		try {
			DashboardStorage.clearDashboard(projectId);
			validatedTopicStore.clearAllAt('widgets');

			const cloudState = await this.#loadFromGraphQL(projectId);

			if (!cloudState) {
				const fresh = cloneEmptyMultiTab();
				this.#tabOrder = fresh.tabOrder;
				this.#tabSlices = fresh.tabs;
				this.#activeTabId = fresh.activeTabId;
				this.#applyTabSlice(fresh.tabs[this.#activeTabId]);
				this.#initialized = true;
				this.#cloudLayoutId = null;
				this.#hasUnsavedChanges = false;
				this.clearUndoHistory();
				DashboardStorage.saveMultiTabState(fresh, projectId);
				this.#cloudSyncStatus = 'idle';
				return false;
			}

			DashboardStorage.saveMultiTabState(cloudState, projectId);
			this.#loadFromSavedState(cloudState);
			this.#emit('dashboard:loaded', undefined);

			this.#hasUnsavedChanges = false;
			this.clearUndoHistory();
			this.#cloudSyncStatus = 'saved';
			return true;
		} catch (err) {
			log.error('reloadFromCloud failed:', err);
			this.#cloudSyncStatus = 'error';
			return false;
		}
	}

	switchTab(tabId: DashboardTabId): void {
		if (tabId === this.#activeTabId) return;
		if (!this.#tabSlices[tabId]) return;

		this.#fullscreenWidgetId = null;
		this.#flushActiveTabIntoSlices();
		clearWidgetTopicsForLayout($state.snapshot(this.#widgets) as Widget[], this.#projectId);

		this.#activeTabId = tabId;
		this.#applyTabSlice(this.#tabSlices[tabId]);

		this.resetInteractionStates();
		this.#scheduleAutoSave();
	}

	addTab(label: string): DashboardTabId {
		const id = generateTabId();
		this.#tabOrder = [...$state.snapshot(this.#tabOrder) as TabInfo[], { id, label }];
		this.#tabSlices = { ...$state.snapshot(this.#tabSlices) as Record<DashboardTabId, TabDashboardSlice>, [id]: createEmptyTabSlice() };
		this.switchTab(id);
		return id;
	}

	removeTab(tabId: DashboardTabId): boolean {
		if (this.#tabOrder.length <= 1) return false;
		const idx = this.#tabOrder.findIndex(t => t.id === tabId);
		if (idx === -1) return false;

		if (tabId === this.#activeTabId) {
			clearWidgetTopicsForLayout($state.snapshot(this.#widgets) as Widget[], this.#projectId);
		} else {
			const slice = this.#tabSlices[tabId];
			if (slice) clearWidgetTopicsForLayout($state.snapshot(slice.widgets) as Widget[], this.#projectId);
		}

		const newOrder = ($state.snapshot(this.#tabOrder) as TabInfo[]).filter(t => t.id !== tabId);
		const newSlices = { ...$state.snapshot(this.#tabSlices) as Record<DashboardTabId, TabDashboardSlice> };
		delete newSlices[tabId];

		this.#tabOrder = newOrder;
		this.#tabSlices = newSlices;

		if (tabId === this.#activeTabId) {
			const nextIdx = Math.min(idx, newOrder.length - 1);
			this.#activeTabId = newOrder[nextIdx].id;
			this.#applyTabSlice(this.#tabSlices[this.#activeTabId]);
			this.resetInteractionStates();
		}

		this.#scheduleAutoSave();
		return true;
	}

	renameTab(tabId: DashboardTabId, newLabel: string): void {
		const order = $state.snapshot(this.#tabOrder) as TabInfo[];
		const tab = order.find(t => t.id === tabId);
		if (!tab) return;
		tab.label = newLabel;
		this.#tabOrder = order;
		this.#scheduleAutoSave();
	}

	/**
	 * Move a widget from the active tab to a different tab.
	 * The target tab's grid auto-expands if there is no free space.
	 */
	moveWidgetToTab(widgetId: string, targetTabId: DashboardTabId): boolean {
		if (targetTabId === this.#activeTabId) return false;
		if (!this.#tabSlices[targetTabId]) return false;

		const widget = this.#widgets.find((w) => w.id === widgetId);
		if (!widget) return false;

		const widgetSnapshot = $state.snapshot(widget) as Widget;
		const topic = resolveWidgetTopic(widgetSnapshot, this.#projectId);
		const topicData = validatedTopicStore.at(topic);

		this.removeWidget(widgetId);

		const slice = structuredClone($state.snapshot(this.#tabSlices[targetTabId])) as TabDashboardSlice;
		const { position, config } = this.#findPositionInSlice(slice, widgetSnapshot.colSpan, widgetSnapshot.rowSpan);

		const movedWidget: Widget = { ...widgetSnapshot, gridColumn: position.gridColumn, gridRow: position.gridRow };
		slice.widgets = [...slice.widgets, movedWidget];
		slice.config = config;

		if (topicData != null) {
			slice.widgetData = { ...slice.widgetData, [topic]: structuredClone(topicData) };
		}

		this.#tabSlices = { ...$state.snapshot(this.#tabSlices) as Record<DashboardTabId, TabDashboardSlice>, [targetTabId]: slice };
		this.#scheduleAutoSave();

		return true;
	}

	/**
	 * Add a new widget to a specific tab. If the target is the active tab,
	 * delegates to `addWidget()`. Otherwise injects directly into the tab slice.
	 * The target tab's grid auto-expands if there is no free space.
	 */
	addWidgetToTab(widget: Widget, targetTabId: DashboardTabId): boolean {
		if (targetTabId === this.#activeTabId) {
			return this.addWidget(widget);
		}
		if (!this.#tabSlices[targetTabId]) return false;

		const slice = structuredClone($state.snapshot(this.#tabSlices[targetTabId])) as TabDashboardSlice;
		const { position, config } = this.#findPositionInSlice(slice, widget.colSpan, widget.rowSpan);

		const placed: Widget = { ...widget, gridColumn: position.gridColumn, gridRow: position.gridRow };
		slice.widgets = [...slice.widgets, placed];
		slice.config = config;

		this.#tabSlices = { ...$state.snapshot(this.#tabSlices) as Record<DashboardTabId, TabDashboardSlice>, [targetTabId]: slice };
		this.#scheduleAutoSave();

		return true;
	}

	/**
	 * Ensures widgets from app config exist on a tab (default: Market). Safe when that tab is not active.
	 */
	mergeMissingWidgetsFromConfig(tabId: DashboardTabId, configWidgets: Widget[]): void {
		const slice = $state.snapshot(this.#tabSlices[tabId]) as TabDashboardSlice;
		const newWidgets = configWidgets
			.filter((cw) => !slice.widgets.some((w) => w.id === cw.id))
			.map((cw) => structuredClone(cw));
		if (newWidgets.length === 0) return;
		slice.widgets = [...slice.widgets, ...newWidgets];

		this.#tabSlices = { ...$state.snapshot(this.#tabSlices), [tabId]: slice } as Record<DashboardTabId, TabDashboardSlice>;

		if (this.#activeTabId === tabId) {
			this.#widgets = [...slice.widgets];
			this.#widgetZIndexMap.clear();
			this.#nextZIndex = 1;
			this.#widgets.forEach((widget, index) => {
				this.#widgetZIndexMap.set(widget.id, index + 1);
				this.#nextZIndex = Math.max(this.#nextZIndex, index + 2);
			});
			this.ensureGridCapacity();
		}

		this.#scheduleAutoSave();
	}
	
	// Widget Management
	addWidget(widget: Widget): boolean {
		try {
			this.#validateWidget(widget);
			
			if (!this.canPlaceWidget(widget)) {
				this.#autoExpandGrid(widget);
			}
			
			if (!this.canPlaceWidget(widget)) {
				throw new DashboardError(
					'Cannot place widget in current grid',
					'PLACEMENT_FAILED'
				);
			}
			
			this.#widgets = [...this.#widgets, widget];
			this.#widgetZIndexMap.set(widget.id, this.#nextZIndex++);
			this.#scheduleAutoSave();
			this.#emit('widget:added', widget);
			
			return true;
		} catch (error) {
			log.error('Failed to add widget:', error);
			return false;
		}
	}
	
	removeWidget(id: string): boolean {
		const widget = this.#widgets.find(w => w.id === id);
		if (!widget) return false;

		if (this.#fullscreenWidgetId === id) {
			this.#fullscreenWidgetId = null;
		}

		this.#widgets = this.#widgets.filter((w) => w.id !== id);
		this.#widgetZIndexMap.delete(id);
		this.#scheduleAutoSave();
		this.#emit('widget:removed', id);
		
		return true;
	}
	
	/** Lock or unlock every widget on the active tab in one update. */
	setAllWidgetsLocked(locked: boolean): void {
		if (this.#widgets.length === 0) return;
		this.#widgets = this.#widgets.map((w) => ({ ...w, locked }));
		this.#scheduleAutoSave();
	}

	updateWidget(id: string, updates: WidgetUpdate): boolean {
		const index = this.#widgets.findIndex((w) => w.id === id);
		if (index === -1) return false;
		
		const updatedWidget = { ...this.#widgets[index], ...updates } as Widget;
		this.#validateWidget(updatedWidget);
		
		// Create new array to trigger reactivity
		const newWidgets = [...this.#widgets];
		newWidgets[index] = updatedWidget;
		this.#widgets = newWidgets;
		
		this.#scheduleAutoSave();
		this.#emit('widget:updated', { id, updates });
		
		return true;
	}
	
	duplicateWidget(id: string): string | null {
		const widget = this.#widgets.find((w) => w.id === id);
		if (!widget) return null;
		
		const position = findAvailablePosition(
			widget.colSpan,
			widget.rowSpan,
			this.#config.gridColumns,
			this.#config.gridRows,
			this.#widgets
		);
		
		if (!position) {
			log.warn('No available space for duplicate widget');
			return null;
		}
		
		const newId = this.#generateWidgetId();
		const newWidget: Widget = {
			...($state.snapshot(widget) as Widget),
			id: newId,
			gridColumn: position.gridColumn,
			gridRow: position.gridRow,
			title: widget.title ? `${widget.title} (Copy)` : undefined,
			topicOverride: undefined
		};

		if (!this.addWidget(newWidget)) return null;

		const sourceTopic = resolveWidgetTopic(widget, this.#projectId);
		const sourceData = validatedTopicStore.at(sourceTopic);
		if (sourceData != null) {
			const destTopic = resolveWidgetTopic(newWidget, this.#projectId);
			try {
				validatedTopicStore.publish(destTopic, structuredClone(sourceData));
			} catch (e) {
				log.warn(`Failed to copy topic data to ${destTopic}:`, e);
			}
		}

		return newId;
	}
	
	moveWidget(id: string, position: Position): boolean {
		const widget = this.#widgets.find((w) => w.id === id);
		if (!widget || widget.locked) return false;
		
		const testWidget = { ...widget, ...position };
		
		if (!this.canPlaceWidget(testWidget, id)) {
			this.#autoExpandGrid(testWidget);
		}
		
		if (!this.canPlaceWidget(testWidget, id)) {
			return false;
		}
		
		return this.updateWidget(id, position);
	}
	
	resizeWidget(id: string, colSpan: number, rowSpan: number): boolean {
		const widget = this.#widgets.find((w) => w.id === id);
		if (!widget || widget.locked) return false;

		const newColSpan = this.#clamp(
			colSpan,
			widget.minWidth || 1,
			widget.maxWidth || this.#config.gridColumns
		);

		const newRowSpan = this.#clamp(
			rowSpan,
			widget.minHeight || 1,
			widget.maxHeight || this.#config.gridRows
		);

		if (!this.fitsInColumns(newColSpan, widget.gridColumn)) {
			return false;
		}

		const placed: WidgetRect = {
			id: widget.id,
			gridColumn: widget.gridColumn,
			gridRow: widget.gridRow,
			colSpan: newColSpan,
			rowSpan: newRowSpan
		};

		const others: WidgetRect[] = this.#widgets
			.filter((w) => w.id !== id)
			.map((w) => ({
				id: w.id,
				gridColumn: w.gridColumn,
				gridRow: w.gridRow,
				colSpan: w.colSpan,
				rowSpan: w.rowSpan
			}));

		const displaced = resolveCollisions(placed, others);

		const newWidgets = this.#widgets.map((w) => {
			if (w.id === id) {
				return { ...w, colSpan: newColSpan, rowSpan: newRowSpan } as Widget;
			}
			const newPos = displaced.get(w.id);
			return newPos ? ({ ...w, ...newPos } as Widget) : w;
		});

		let maxRow = 0;
		for (const w of newWidgets) {
			const bottom = w.gridRow + w.rowSpan - 1;
			if (bottom > maxRow) maxRow = bottom;
		}
		if (maxRow > this.#config.gridRows) {
			this.#config = { ...this.#config, gridRows: maxRow + GRID_BUFFER_ROWS };
		}

		this.#widgets = newWidgets;
		this.#displacementPreview = Object.fromEntries(displaced);
		this.#scheduleAutoSave();
		this.#emit('widget:updated', { id, updates: { colSpan: newColSpan, rowSpan: newRowSpan } });
		return true;
	}
	
	// Z-index management
	bringWidgetToFront(id: string): void {
		if (!this.#widgetZIndexMap.has(id)) return;
		this.#widgetZIndexMap.set(id, this.#nextZIndex++);
		this.#scheduleAutoSave();
	}
	
	sendWidgetToBack(id: string): void {
		if (!this.#widgetZIndexMap.has(id)) return;
		
		const minZIndex = Math.min(...Array.from(this.#widgetZIndexMap.values()));
		this.#widgetZIndexMap.set(id, minZIndex - 1);
		this.#scheduleAutoSave();
	}
	
	getWidgetZIndex(id: string): number {
		return this.#widgetZIndexMap.get(id) || 0;
	}
	
	// Position validation
	canPlaceWidget(
		widget: GridPosition,
		excludeId?: string
	): boolean {
		return isValidPosition(
			widget.gridColumn,
			widget.gridRow,
			widget.colSpan,
			widget.rowSpan,
			this.#config.gridColumns,
			this.#config.gridRows,
			this.#widgets.filter((w) => w.id !== excludeId)
		);
	}
	
	// State setters
	setDragState(state: Partial<DragState>): void {
		this.#dragState = { ...this.#dragState, ...state };
	}
	
	setResizeState(state: Partial<ResizeState>): void {
		this.#resizeState = { ...this.#resizeState, ...state };
	}
	
	resetInteractionStates(): void {
		this.#dragState = structuredClone(DEFAULT_DRAG_STATE);
		this.#resizeState = structuredClone(DEFAULT_RESIZE_STATE);
		this.#displacementPreview = {};
	}

	setFullscreenWidget(id: string | null): void {
		this.#fullscreenWidgetId = id;
	}

	/**
	 * Checks whether the widget fits within the column bounds of the grid
	 * (rows can always auto-expand, so only columns matter for validity).
	 */
	fitsInColumns(colSpan: number, gridColumn: number): boolean {
		return gridColumn >= 1 && gridColumn + colSpan - 1 <= this.#config.gridColumns;
	}

	/**
	 * Compute and store a live preview of where other widgets would be displaced
	 * if `movingWidgetId` were dropped at `targetPosition`.
	 */
	setDisplacementPreview(movingWidgetId: string, targetPosition: Position): void {
		const widget = this.#widgets.find((w) => w.id === movingWidgetId);
		if (!widget) {
			this.#displacementPreview = {};
			return;
		}

		const placed: WidgetRect = {
			id: widget.id,
			gridColumn: targetPosition.gridColumn,
			gridRow: targetPosition.gridRow,
			colSpan: widget.colSpan,
			rowSpan: widget.rowSpan
		};

		const others: WidgetRect[] = this.#widgets
			.filter((w) => w.id !== movingWidgetId)
			.map((w) => ({
				id: w.id,
				gridColumn: w.gridColumn,
				gridRow: w.gridRow,
				colSpan: w.colSpan,
				rowSpan: w.rowSpan
			}));

		const displaced = resolveCollisions(placed, others);
		this.#displacementPreview = Object.fromEntries(displaced);
	}

	clearDisplacementPreview(): void {
		this.#displacementPreview = {};
	}

	/**
	 * Move a widget to a new position, pushing overlapping widgets downward.
	 * Auto-expands the grid rows as needed.
	 */
	moveWidgetWithDisplacement(id: string, position: Position): boolean {
		const widget = this.#widgets.find((w) => w.id === id);
		if (!widget) return false;

		if (!this.fitsInColumns(widget.colSpan, position.gridColumn)) {
			return false;
		}

		const placed: WidgetRect = {
			id: widget.id,
			gridColumn: position.gridColumn,
			gridRow: position.gridRow,
			colSpan: widget.colSpan,
			rowSpan: widget.rowSpan
		};

		const others: WidgetRect[] = this.#widgets
			.filter((w) => w.id !== id)
			.map((w) => ({
				id: w.id,
				gridColumn: w.gridColumn,
				gridRow: w.gridRow,
				colSpan: w.colSpan,
				rowSpan: w.rowSpan
			}));

		const displaced = resolveCollisions(placed, others);

		const newWidgets = this.#widgets.map((w) => {
			if (w.id === id) {
				return { ...w, ...position } as Widget;
			}
			const newPos = displaced.get(w.id);
			return newPos ? ({ ...w, ...newPos } as Widget) : w;
		});

		let maxRow = 0;
		for (const w of newWidgets) {
			const bottom = w.gridRow + w.rowSpan - 1;
			if (bottom > maxRow) maxRow = bottom;
		}
		if (maxRow > this.#config.gridRows) {
			this.#config = { ...this.#config, gridRows: maxRow + GRID_BUFFER_ROWS };
		}

		this.#widgets = newWidgets;
		this.#displacementPreview = {};
		this.#scheduleAutoSave();
		this.#emit('widget:updated', { id, updates: position });
		return true;
	}
	
	updateGridConfig(config: Partial<DashboardConfig>): void {
		this.#config = { ...this.#config, ...config };
		this.#scheduleAutoSave();
	}
	
	// Settings
	setAutoSave(enabled: boolean): void {
		this.#autoSaveEnabled = enabled;
		if (enabled && this.#hasUnsavedChanges) {
			this.save();
		}
	}
	
	setAutoSaveWidgetData(enabled: boolean): void {
		this.#autoSaveWidgetData = enabled;
		DashboardStorage.setAutoSaveWidgetData(enabled);
		log.info(`Widget data auto-save: ${enabled ? 'enabled' : 'disabled'}`);
	}
	
	setDevMode(enabled: boolean): void {
		this.#devMode = enabled;
		log.info(`Dev mode ${enabled ? 'enabled' : 'disabled'}`);
	}
	
	// Data management
	resetToDefault(defaultWidgets?: Widget[]): void {
		log.info('Resetting active tab to default layout...');

		this.#suspendAutoSave = true;
		try {
			clearWidgetTopicsForLayout($state.snapshot(this.#widgets) as Widget[], this.#projectId);

			this.#widgets = [];
			this.#widgetZIndexMap.clear();
			this.#nextZIndex = 1;
			this.#config = structuredClone(DEFAULT_CONFIG);

			if (defaultWidgets && defaultWidgets.length > 0) {
				defaultWidgets.forEach((widget) => {
					this.addWidget(structuredClone(widget));
				});
				this.ensureGridCapacity();
			}

			this.#emit('dashboard:reset', undefined);
		} finally {
			queueMicrotask(() => {
				this.#suspendAutoSave = false;
				if (this.#autoSaveEnabled) {
					this.save();
				}
			});
		}

		if (defaultWidgets && defaultWidgets.length > 0) {
			log.info(`Reset complete: loaded default layout (${defaultWidgets.length} widgets) on ${this.#activeTabId}`);
		} else {
			log.info('Reset complete (no default widgets)');
		}
	}
	
	clearSavedDashboard(): boolean {
		log.info('Clearing saved dashboard...');
		const success = DashboardStorage.clearDashboard(this.#projectId);
		
		if (success) {
			validatedTopicStore.clearAllAt('widgets');
			const fresh = cloneEmptyMultiTab();
			this.#tabOrder = fresh.tabOrder;
			this.#tabSlices = fresh.tabs;
			this.#activeTabId = DEFAULT_ACTIVE_TAB;
			this.#widgets = [];
			this.#widgetZIndexMap.clear();
			this.#nextZIndex = 1;
			this.#config = structuredClone(DEFAULT_CONFIG);
			this.#hasUnsavedChanges = false;
			this.#cloudLayoutId = null;
			if (this.#cloudSaveTimeout) {
				clearTimeout(this.#cloudSaveTimeout);
				this.#cloudSaveTimeout = null;
			}
			log.info('Dashboard cleared');
		}
		
		return success;
	}
	
	exportDashboard(): string | null {
		try {
			return DashboardStorage.exportDashboard(this.#projectId);
		} catch (error) {
			log.error('Failed to export dashboard:', error);
			return null;
		}
	}

	importDashboard(jsonString: string): boolean {
		try {
			const success = DashboardStorage.importDashboard(jsonString, this.#projectId);
			if (!success) return false;
			
			const savedState = DashboardStorage.loadDashboard(this.#projectId);
			if (!savedState) return false;
			
			this.#loadFromSavedState(savedState);
			return true;
		} catch (error) {
			log.error('Failed to import dashboard:', error);
			return false;
		}
	}
	
	// Event system
	on<K extends keyof DashboardEvents>(
		event: K,
		callback: (data: DashboardEvents[K]) => void
	): () => void {
		if (!this.#eventListeners.has(event)) {
			this.#eventListeners.set(event, new Set());
		}
		
		this.#eventListeners.get(event)!.add(callback);
		
		// Return unsubscribe function
		return () => {
			this.#eventListeners.get(event)?.delete(callback);
		};
	}
	
	// ─── Undo / Redo ──────────────────────────────────────────────────
	#takeLayoutSnapshot(): LayoutSnapshot {
		return this.#widgets.map((w) => ({
			id: w.id,
			gridColumn: w.gridColumn,
			gridRow: w.gridRow,
			colSpan: w.colSpan,
			rowSpan: w.rowSpan
		}));
	}

	pushUndoSnapshot(): void {
		this.#undoStack.push(this.#takeLayoutSnapshot());
		if (this.#undoStack.length > UNDO_STACK_LIMIT) {
			this.#undoStack.shift();
		}
		this.#redoStack = [];
	}

	#applyLayoutSnapshot(snapshot: LayoutSnapshot): void {
		const lookup = new Map(snapshot.map((s) => [s.id, s]));
		this.#widgets = this.#widgets.map((w) => {
			const s = lookup.get(w.id);
			return s
				? ({ ...w, gridColumn: s.gridColumn, gridRow: s.gridRow, colSpan: s.colSpan, rowSpan: s.rowSpan } as Widget)
				: w;
		});
		this.ensureGridCapacity();
		this.#scheduleAutoSave();
	}

	undo(): boolean {
		const snapshot = this.#undoStack.pop();
		if (!snapshot) return false;
		this.#redoStack.push(this.#takeLayoutSnapshot());
		this.#applyLayoutSnapshot(snapshot);
		return true;
	}

	redo(): boolean {
		const snapshot = this.#redoStack.pop();
		if (!snapshot) return false;
		this.#undoStack.push(this.#takeLayoutSnapshot());
		this.#applyLayoutSnapshot(snapshot);
		return true;
	}

	clearUndoHistory(): void {
		this.#undoStack = [];
		this.#redoStack = [];
	}

	// Private methods
	#snapshotMultiTabState(): MultiTabDashboardState {
		const activeSlice: TabDashboardSlice = {
			widgets: $state.snapshot(this.#widgets) as Widget[],
			config: $state.snapshot(this.#config) as DashboardConfig,
			widgetData: DashboardStorage.collectWidgetDataFromStore()
		};
		const state: MultiTabDashboardState = {
			version: DASHBOARD_STORAGE_VERSION,
			activeTabId: this.#activeTabId,
			tabOrder: $state.snapshot(this.#tabOrder) as TabInfo[],
			tabs: {
				...($state.snapshot(this.#tabSlices) as MultiTabDashboardState['tabs']),
				[this.#activeTabId]: activeSlice
			}
		};
		if (this.#cloudLayoutId) {
			state.cloudLayoutId = this.#cloudLayoutId;
		}
		return state;
	}

	/**
	 * Persist the live active-tab state (#widgets / #config) back into #tabSlices.
	 * Only needed before #applyTabSlice() overwrites the live state (i.e. tab switching).
	 * Serialization paths (save, syncToCloud, etc.) do NOT need this — #snapshotMultiTabState()
	 * builds the active tab's slice inline.
	 */
	#flushActiveTabIntoSlices(): void {
		this.#tabSlices = {
			...$state.snapshot(this.#tabSlices),
			[this.#activeTabId]: {
				widgets: $state.snapshot(this.#widgets),
				config: $state.snapshot(this.#config),
				widgetData: DashboardStorage.collectWidgetDataFromStore()
			}
		};
	}

	#applyTabSlice(slice: TabDashboardSlice): void {
		if (this.#widgets.length > 0) {
			clearWidgetTopicsForLayout($state.snapshot(this.#widgets) as Widget[], this.#projectId);
		}

		const plain = $state.snapshot(slice) as TabDashboardSlice;
		this.#widgets = plain.widgets;
		this.#config = plain.config;

		if (repairOverlaps(this.#widgets)) {
			log.info('Repaired overlapping widget positions');
		}

		this.#widgetZIndexMap.clear();
		this.#nextZIndex = 1;
		this.#widgets.forEach((widget, index) => {
			this.#widgetZIndexMap.set(widget.id, index + 1);
			this.#nextZIndex = Math.max(this.#nextZIndex, index + 2);
		});

		DashboardStorage.restoreWidgetDataSnapshot(plain.widgetData ?? {});

		this.ensureGridCapacity();
	}

	#loadFromSavedState(savedState: MultiTabDashboardState): void {
		const tabOrder = structuredClone(savedState.tabOrder);
		const slices: Record<DashboardTabId, TabDashboardSlice> = {};
		for (const t of tabOrder) {
			slices[t.id] = savedState.tabs[t.id]
				? structuredClone(savedState.tabs[t.id])
				: createEmptyTabSlice();
		}
		this.#tabOrder = tabOrder;
		this.#tabSlices = slices;
		this.#activeTabId = savedState.activeTabId;
		this.#applyTabSlice(slices[this.#activeTabId]);
		this.#initialized = true;

		const persistedLayoutId = savedState.cloudLayoutId;
		if (typeof persistedLayoutId === 'string' && persistedLayoutId.length > 0) {
			this.#cloudLayoutId = persistedLayoutId;
		}
	}
	
	#scheduleAutoSave(): void {
		if (this.#suspendAutoSave || !this.#autoSaveEnabled) return;
		
		if (this.#autoSaveTimeout) {
			clearTimeout(this.#autoSaveTimeout);
		}
		
		this.#autoSaveTimeout = setTimeout(() => {
			this.save();
			this.#autoSaveTimeout = null;
		}, AUTO_SAVE_DELAY_MS);
		
		this.#hasUnsavedChanges = true;
	}
	
	#findPositionInSlice(
		slice: TabDashboardSlice,
		colSpan: number,
		rowSpan: number
	): { position: Position; config: DashboardConfig } {
		let position = findAvailablePosition(colSpan, rowSpan, slice.config.gridColumns, slice.config.gridRows, slice.widgets);
		if (position) return { position, config: slice.config };

		const maxRow = slice.widgets.reduce((m, w) => Math.max(m, w.gridRow + w.rowSpan - 1), 0);
		const expandedRows = maxRow + rowSpan + GRID_BUFFER_ROWS;
		const expandedConfig = { ...slice.config, gridRows: expandedRows };

		position = findAvailablePosition(colSpan, rowSpan, expandedConfig.gridColumns, expandedRows, slice.widgets);
		if (position) return { position, config: expandedConfig };

		return {
			position: { gridColumn: 1, gridRow: maxRow + 1 },
			config: { ...expandedConfig, gridRows: maxRow + 1 + rowSpan + GRID_BUFFER_ROWS }
		};
	}

	#autoExpandGrid(widget: GridPosition): boolean {
		const requiredRows = widget.gridRow + widget.rowSpan - 1;
		const requiredColumns = widget.gridColumn + widget.colSpan - 1;
		const targetRows = requiredRows + GRID_BUFFER_ROWS;
		
		let expanded = false;
		const oldRows = this.#config.gridRows;
		const oldColumns = this.#config.gridColumns;
		
		if (targetRows > this.#config.gridRows) {
			this.#config = { ...this.#config, gridRows: targetRows };
			expanded = true;
		}
		
		if (requiredColumns > this.#config.gridColumns) {
			this.#config = { ...this.#config, gridColumns: requiredColumns };
			expanded = true;
		}
		
		if (expanded) {
			log.debug(`Grid expanded: ${oldColumns}x${oldRows} -> ${this.#config.gridColumns}x${this.#config.gridRows}`);
			this.#scheduleAutoSave();
			this.#emit('grid:expanded', { 
				rows: this.#config.gridRows, 
				columns: this.#config.gridColumns 
			});
		}
		
		return expanded;
	}
	
	ensureGridCapacity(): void {
		if (this.#widgets.length === 0) return;
		
		const maxRowUsed = Math.max(
			...this.#widgets.map(w => w.gridRow + w.rowSpan - 1)
		);
		
		const minRequiredRows = maxRowUsed + GRID_BUFFER_ROWS;
		
		if (minRequiredRows > this.#config.gridRows) {
			log.debug(`Ensuring capacity: ${this.#config.gridRows} -> ${minRequiredRows} rows`);
			this.#config = { ...this.#config, gridRows: minRequiredRows };
			this.#scheduleAutoSave();
		}
	}
	
	#computeOccupiedCells(): Set<string> {
		const occupied = new Set<string>();
		
		for (const widget of this.#widgets) {
			for (let r = 0; r < widget.rowSpan; r++) {
				for (let c = 0; c < widget.colSpan; c++) {
					const row = widget.gridRow - 1 + r;
					const col = widget.gridColumn - 1 + c;
					occupied.add(`${row},${col}`);
				}
			}
		}
		
		return occupied;
	}
	
	#validateWidget(widget: Widget): void {
		if (!widget.id) {
			throw new DashboardError('Widget must have an ID', 'INVALID_WIDGET');
		}
		
		if (widget.gridColumn < 1 || widget.gridRow < 1) {
			throw new DashboardError('Widget position must be positive', 'INVALID_POSITION');
		}
		
		if (widget.colSpan < 1 || widget.rowSpan < 1) {
			throw new DashboardError('Widget size must be positive', 'INVALID_SIZE');
		}
	}
	
	#generateWidgetId(): string {
		return generateWidgetId();
	}
	
	#clamp(value: number, min: number, max: number): number {
		return Math.max(min, Math.min(max, value));
	}
	
	#emit<K extends keyof DashboardEvents>(event: K, data: DashboardEvents[K]): void {
		const listeners = this.#eventListeners.get(event);
		if (listeners) {
			listeners.forEach(callback => callback(data));
		}
	}

	// ─── Direct GraphQL Cloud Sync ──────────────────────────────────

	#scheduleCloudSave(state: MultiTabDashboardState): void {
		if (this.#cloudSaveTimeout) clearTimeout(this.#cloudSaveTimeout);
		this.#cloudSaveTimeout = setTimeout(() => {
			this.#cloudSaveTimeout = null;
			if (!this.#idToken) return;
			this.#cloudSyncStatus = 'saving';
			this.#saveToGraphQL(state).then((layout) => {
				this.#cloudSyncStatus = layout ? 'saved' : 'error';
			}).catch(() => {
				this.#cloudSyncStatus = 'error';
			});
		}, CLOUD_SAVE_DEBOUNCE_MS);
	}

	async #loadFromGraphQL(projectId: string): Promise<MultiTabDashboardState | null> {
		if (!this.#idToken) return null;

		const result = await gql<{
			listDashboardLayouts: { items: DashboardLayout[]; nextToken: string | null };
		}>(Q_LIST_DASHBOARD_LAYOUTS, { parentId: projectId, limit: 1 }, this.#idToken);

		const items = result?.listDashboardLayouts?.items;
		if (!items || items.length === 0) return null;

		const layout = items[0];
		this.#cloudLayoutId = layout.id;

		if (!layout.state) return null;

		let parsed: unknown;
		try {
			parsed = typeof layout.state === 'string' ? JSON.parse(layout.state) : layout.state;
		} catch {
			log.warn('Cloud layout state is not valid JSON');
			return null;
		}

		if (!parsed || typeof parsed !== 'object' || (parsed as any).version !== DASHBOARD_STORAGE_VERSION) {
			log.warn('Cloud state failed validation');
			return null;
		}

		const cloudState = parsed as MultiTabDashboardState;
		cloudState.cloudLayoutId = layout.id;
		return cloudState;
	}

	async #saveToGraphQL(state: MultiTabDashboardState): Promise<DashboardLayout | null> {
		if (!this.#idToken || !this.#projectId) return null;

		const stateJson = JSON.stringify(state);

		try {
			if (this.#cloudLayoutId) {
				const result = await gql<{ updateDashboardLayout: DashboardLayout }>(
					M_UPDATE_DASHBOARD_LAYOUT,
					{
						key: { id: this.#cloudLayoutId, parentId: this.#projectId },
						input: { state: stateJson, version: DASHBOARD_STORAGE_VERSION }
					},
					this.#idToken
				);
				const layout = result?.updateDashboardLayout;
				if (layout?.id) this.#cloudLayoutId = layout.id;
				return layout ?? null;
			} else {
				return this.#createCloudLayout(state);
			}
		} catch (err) {
			log.error('Failed to save to cloud:', err);
			return null;
		}
	}

	async #createCloudLayout(state: MultiTabDashboardState): Promise<DashboardLayout | null> {
		if (!this.#idToken || !this.#projectId) return null;

		try {
			const stateJson = JSON.stringify(state);
			const result = await gql<{ createDashboardLayout: DashboardLayout }>(
				M_CREATE_DASHBOARD_LAYOUT,
				{ input: { parentId: this.#projectId, state: stateJson, version: DASHBOARD_STORAGE_VERSION } },
				this.#idToken
			);
			const layout = result?.createDashboardLayout;
			if (layout?.id) {
				this.#cloudLayoutId = layout.id;
				const updated = { ...state, cloudLayoutId: layout.id };
				DashboardStorage.saveMultiTabState(updated, this.#projectId);
			}
			return layout ?? null;
		} catch (err) {
			log.error('Failed to create cloud layout:', err);
			return null;
		}
	}
}

// Export singleton instance
export const dashboard = new DashboardStore();

// Export types for consumers
export type { DashboardStore, DashboardEvents, WidgetUpdate, GridPosition, DashboardTabId, TabInfo };