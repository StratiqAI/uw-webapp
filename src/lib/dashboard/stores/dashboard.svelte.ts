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
import { getWidgetTopic } from '$lib/dashboard/setup/widgetSchemaRegistration';
import { isValidPosition, findAvailablePosition, resolveCollisions, repairOverlaps } from '$lib/dashboard/utils/grid';
import type { WidgetRect } from '$lib/dashboard/utils/grid';
import { DashboardStorage } from '$lib/dashboard/utils/storage';
import { validatedTopicStore } from '$lib/stores/validatedTopicStore';

const DEFAULT_CONFIG: DashboardConfig = structuredClone(DEFAULT_DASHBOARD_CONFIG);

function cloneEmptyMultiTab(): MultiTabDashboardState {
	return structuredClone(createEmptyMultiTabState());
}

function clearWidgetTopicsForLayout(widgets: Widget[]): void {
	for (const w of widgets) {
		const topic = getWidgetTopic(w.type, w.id, w.topicOverride);
		validatedTopicStore.delete(topic);
	}
}

const DEFAULT_DRAG_STATE: DragState = {
	isDragging: false,
	activeWidgetId: null,
	ghostPosition: null
} as const;

const DEFAULT_RESIZE_STATE: ResizeState = {
	isResizing: false,
	activeWidgetId: null,
	resizeHandle: null
} as const;

const GRID_BUFFER_ROWS = 2;
const AUTO_SAVE_DELAY_MS = 1000;

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
	#widgets = $state<Widget[]>([]);
	#widgetZIndexMap = $state<Map<string, number>>(new Map());
	#config = $state<DashboardConfig>(structuredClone(DEFAULT_CONFIG));
	#dragState = $state<DragState>(structuredClone(DEFAULT_DRAG_STATE));
	#resizeState = $state<ResizeState>(structuredClone(DEFAULT_RESIZE_STATE));
	#fullscreenWidgetId = $state<string | null>(null);
	#displacementPreview = $state<Record<string, Position>>({});
	
	// Settings
	#autoSaveEnabled = $state(true);
	#autoSaveWidgetData = $state(true);
	#devMode = $state(false);
	#hasUnsavedChanges = $state(false);
	#projectId = $state<string | null>(null);
	#activeTabId = $state<DashboardTabId>(DEFAULT_ACTIVE_TAB);
	#tabOrder = $state<TabInfo[]>(structuredClone(DEFAULT_TABS) as TabInfo[]);
	#tabSlices = $state<Record<DashboardTabId, TabDashboardSlice>>(cloneEmptyMultiTab().tabs);
	
	// Private state
	#initialized = false;
	#nextZIndex = 1;
	#autoSaveTimeout: ReturnType<typeof setTimeout> | null = null;
	#eventListeners = new Map<keyof DashboardEvents, Set<Function>>();
	#suspendAutoSave = false;

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
	get tabIds(): DashboardTabId[] { return this.#tabOrder.map(t => t.id); }
	get isInitialized() { return this.#initialized; }
	
	// Derived state with memoization
	gridCells = $derived.by(() => this.#computeGridCells());
	
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
	initialize(projectId: string | null = null): boolean {
		if (this.#initialized && this.#projectId === projectId) {
			console.warn('Dashboard already initialized for this project');
			return true;
		}
		
		// If switching projects, save current dashboard first
		if (this.#initialized && this.#projectId !== projectId && this.#hasUnsavedChanges) {
			this.save();
		}
		
		// Reset state for new project
		this.#widgets = [];
		this.#widgetZIndexMap.clear();
		this.#fullscreenWidgetId = null;
		this.#nextZIndex = 1;
		this.#hasUnsavedChanges = false;
		this.#projectId = projectId;
		this.#initialized = false;
		this.#activeTabId = DEFAULT_ACTIVE_TAB;
		const fresh = cloneEmptyMultiTab();
		this.#tabOrder = fresh.tabOrder;
		this.#tabSlices = fresh.tabs;
		
		try {
			DashboardStorage.setAutoSaveWidgetData(this.#autoSaveWidgetData);
			
			if (this.#devMode) {
				this.#applyTabSlice(fresh.tabs[DEFAULT_ACTIVE_TAB]);
				this.#initialized = true;
				console.info('📦 Dashboard initialized in dev mode (localStorage disabled)');
				return false;
			}
			
			const savedState = DashboardStorage.loadDashboard(projectId);
			if (savedState) {
				this.#loadFromSavedState(savedState);
				this.#emit('dashboard:loaded', undefined);
				return true;
			}
			
			this.#applyTabSlice(fresh.tabs[DEFAULT_ACTIVE_TAB]);
			this.#initialized = true;
			return false;
		} catch (error) {
			console.error('Failed to initialize dashboard:', error);
			this.#initialized = true;
			return false;
		}
	}
	
	// Save operations
	save(): boolean {
		if (this.#devMode) {
			console.info('📦 Dashboard save skipped (dev mode)');
			return false;
		}
		
		try {
			this.#flushActiveTabIntoSlices();
			const state: MultiTabDashboardState = {
				version: DASHBOARD_STORAGE_VERSION,
				activeTabId: this.#activeTabId,
				tabOrder: $state.snapshot(this.#tabOrder) as TabInfo[],
				tabs: $state.snapshot(this.#tabSlices) as MultiTabDashboardState['tabs']
			};
			const success = DashboardStorage.saveMultiTabState(state, this.#projectId);
			if (success) {
				this.#hasUnsavedChanges = false;
				this.#emit('dashboard:saved', undefined);
				console.info('💾 Dashboard saved');
			}
			return success;
		} catch (error) {
			console.error('Failed to save dashboard:', error);
			return false;
		}
	}

	switchTab(tabId: DashboardTabId): void {
		if (tabId === this.#activeTabId) return;
		if (!this.#tabSlices[tabId]) return;

		this.#fullscreenWidgetId = null;
		this.#flushActiveTabIntoSlices();
		clearWidgetTopicsForLayout($state.snapshot(this.#widgets) as Widget[]);

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
			clearWidgetTopicsForLayout($state.snapshot(this.#widgets) as Widget[]);
		} else {
			const slice = this.#tabSlices[tabId];
			if (slice) clearWidgetTopicsForLayout($state.snapshot(slice.widgets) as Widget[]);
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
	 * Ensures widgets from app config exist on a tab (default: Market). Safe when that tab is not active.
	 */
	mergeMissingWidgetsFromConfig(tabId: DashboardTabId, configWidgets: Widget[]): void {
		const slice = $state.snapshot(this.#tabSlices[tabId]) as TabDashboardSlice;
		let added = false;
		for (const cw of configWidgets) {
			if (slice.widgets.some((w) => w.id === cw.id)) continue;
			slice.widgets.push(structuredClone(cw));
			added = true;
		}
		if (!added) return;

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
			console.error('Failed to add widget:', error);
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
			console.warn('No available space for duplicate widget');
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

		const sourceTopic = getWidgetTopic(widget.type, widget.id, widget.topicOverride);
		const sourceData = validatedTopicStore.at(sourceTopic);
		if (sourceData != null) {
			const destTopic = getWidgetTopic(newWidget.type, newId);
			try {
				validatedTopicStore.publish(destTopic, structuredClone(sourceData));
			} catch (e) {
				console.warn(`[duplicateWidget] Failed to copy topic data to ${destTopic}:`, e);
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
		
		const testWidget = { ...widget, colSpan: newColSpan, rowSpan: newRowSpan };
		
		if (!this.canPlaceWidget(testWidget, id)) {
			this.#autoExpandGrid(testWidget);
		}
		
		if (!this.canPlaceWidget(testWidget, id)) {
			return false;
		}
		
		return this.updateWidget(id, { colSpan: newColSpan, rowSpan: newRowSpan });
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
		console.log(`🔧 Widget data auto-save: ${enabled ? 'enabled' : 'disabled'}`);
	}
	
	setDevMode(enabled: boolean): void {
		this.#devMode = enabled;
		console.info(`📦 Dev mode ${enabled ? 'enabled' : 'disabled'}`);
	}
	
	// Data management
	resetToDefault(defaultWidgets?: Widget[]): void {
		console.log('🔄 Resetting active tab to default layout...');

		this.#suspendAutoSave = true;
		try {
			this.#flushActiveTabIntoSlices();
			clearWidgetTopicsForLayout($state.snapshot(this.#widgets) as Widget[]);

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
				this.#flushActiveTabIntoSlices();
				this.#suspendAutoSave = false;
				if (this.#autoSaveEnabled) {
					this.save();
				}
			});
		}

		if (defaultWidgets && defaultWidgets.length > 0) {
			console.log(`✅ Reset complete: loaded default layout (${defaultWidgets.length} widgets) on ${this.#activeTabId}`);
		} else {
			console.log('✅ Reset complete (no default widgets)');
		}
	}
	
	clearSavedDashboard(): boolean {
		console.log('🧹 Clearing saved dashboard...');
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
			console.log('✅ Dashboard cleared');
		}
		
		return success;
	}
	
	exportDashboard(): string | null {
		try {
			return DashboardStorage.exportDashboard(this.#projectId);
		} catch (error) {
			console.error('Failed to export dashboard:', error);
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
			console.error('Failed to import dashboard:', error);
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
	
	// Private methods
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
			clearWidgetTopicsForLayout($state.snapshot(this.#widgets) as Widget[]);
		}

		const plain = $state.snapshot(slice) as TabDashboardSlice;
		this.#widgets = plain.widgets;
		this.#config = plain.config;

		if (repairOverlaps(this.#widgets)) {
			console.log('🔧 Repaired overlapping widget positions');
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
			console.log(`📏 Grid expanded: ${oldColumns}x${oldRows} → ${this.#config.gridColumns}x${this.#config.gridRows}`);
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
			console.log(`📏 Ensuring capacity: ${this.#config.gridRows} → ${minRequiredRows} rows`);
			this.#config = { ...this.#config, gridRows: minRequiredRows };
			this.#scheduleAutoSave();
		}
	}
	
	#computeGridCells(): boolean[][] {
		const cells: boolean[][] = Array.from(
			{ length: this.#config.gridRows },
			() => new Array(this.#config.gridColumns).fill(false)
		);
		
		for (const widget of this.#widgets) {
			for (let r = 0; r < widget.rowSpan; r++) {
				for (let c = 0; c < widget.colSpan; c++) {
					const row = widget.gridRow - 1 + r;
					const col = widget.gridColumn - 1 + c;
					
					if (row < this.#config.gridRows && col < this.#config.gridColumns) {
						cells[row][col] = true;
					}
				}
			}
		}
		
		return cells;
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
		return `widget-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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
}

// Export singleton instance
export const dashboard = new DashboardStore();

// Export types for consumers
export type { DashboardStore, DashboardEvents, WidgetUpdate, GridPosition, DashboardTabId, TabInfo };