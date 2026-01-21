import type {
	Widget,
	DashboardConfig,
	DragState,
	ResizeState,
	Position
} from '$lib/dashboard/types/widget';
import { isValidPosition, findAvailablePosition } from '$lib/dashboard/utils/grid';
import { DashboardStorage } from '$lib/dashboard/utils/storage';
import { validatedTopicStore } from '$lib/stores/validatedTopicStore';

// Constants for better maintainability
const DEFAULT_CONFIG: DashboardConfig = {
	gridColumns: 12,
	gridRows: 8,
	gap: 16,
	minCellHeight: 100
} as const;

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
	'grid:expanded': { rows: number; columns: number };
}

class DashboardStore {
	// State using Svelte 5 runes
	#widgets = $state<Widget[]>([]);
	#widgetZIndexMap = $state<Map<string, number>>(new Map());
	#config = $state<DashboardConfig>(structuredClone(DEFAULT_CONFIG));
	#dragState = $state<DragState>(structuredClone(DEFAULT_DRAG_STATE));
	#resizeState = $state<ResizeState>(structuredClone(DEFAULT_RESIZE_STATE));
	
	// Settings
	#autoSaveEnabled = $state(true);
	#autoSaveWidgetData = $state(true);
	#devMode = $state(false);
	#hasUnsavedChanges = $state(false);
	#projectId = $state<string | null>(null);
	
	// Private state
	#initialized = false;
	#nextZIndex = 1;
	#autoSaveTimeout: ReturnType<typeof setTimeout> | null = null;
	#eventListeners = new Map<keyof DashboardEvents, Set<Function>>();
	
	// Getters for read-only access
	get widgets() { return this.#widgets; }
	get config() { return this.#config; }
	get dragState() { return this.#dragState; }
	get resizeState() { return this.#resizeState; }
	get hasUnsavedChanges() { return this.#hasUnsavedChanges; }
	get isInitialized() { return this.#initialized; }
	get autoSaveEnabled() { return this.#autoSaveEnabled; }
	get projectId() { return this.#projectId; }
	
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
		this.#nextZIndex = 1;
		this.#hasUnsavedChanges = false;
		this.#projectId = projectId;
		this.#initialized = false;
		
		try {
			DashboardStorage.setAutoSaveWidgetData(this.#autoSaveWidgetData);
			
			if (this.#devMode) {
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
			const success = DashboardStorage.saveDashboard(this.#widgets, this.#config, this.#projectId);
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
		
		this.#widgets = this.#widgets.filter((w) => w.id !== id);
		this.#widgetZIndexMap.delete(id);
		this.#scheduleAutoSave();
		this.#emit('widget:removed', id);
		
		return true;
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
			...structuredClone(widget),
			id: newId,
			gridColumn: position.gridColumn,
			gridRow: position.gridRow,
			title: widget.title ? `${widget.title} (Copy)` : undefined
		};
		
		return this.addWidget(newWidget) ? newId : null;
	}
	
	moveWidget(id: string, position: Position): boolean {
		const widget = this.#widgets.find((w) => w.id === id);
		if (!widget) return false;
		
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
		if (!widget) return false;
		
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
	resetToDefault(): void {
		console.log('🔄 Resetting to default layout...');
		
		this.#widgets = [];
		this.#widgetZIndexMap.clear();
		this.#nextZIndex = 1;
		this.#config = structuredClone(DEFAULT_CONFIG);
		this.#hasUnsavedChanges = false;
		
		validatedTopicStore.clearAllAt('widgets');
		this.clearSavedDashboard();
		
		console.log('✅ Reset complete');
	}
	
	clearSavedDashboard(): boolean {
		console.log('🧹 Clearing saved dashboard...');
		const success = DashboardStorage.clearDashboard(this.#projectId);
		
		if (success) {
			validatedTopicStore.clearAllAt('widgets');
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
	#loadFromSavedState(savedState: { widgets: Widget[]; config: DashboardConfig }): void {
		this.#widgets = savedState.widgets;
		this.#config = savedState.config;
		
		// Initialize z-index map
		this.#widgets.forEach((widget, index) => {
			this.#widgetZIndexMap.set(widget.id, index + 1);
			this.#nextZIndex = Math.max(this.#nextZIndex, index + 2);
		});
		
		this.ensureGridCapacity();
		this.#initialized = true;
		console.info('📂 Dashboard loaded from storage');
	}
	
	#scheduleAutoSave(): void {
		if (!this.#autoSaveEnabled) return;
		
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
export type { DashboardStore, DashboardEvents, WidgetUpdate, GridPosition };