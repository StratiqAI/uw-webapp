// Widget type definitions
// All widgets now use ValidatedTopicStore for reactive data binding with schema validation
export type WidgetType =
	| 'table'
	| 'title'
	| 'paragraph'
	| 'image'
	| 'lineChart'
	| 'barChart'
	| 'donutChart'
	| 'areaChart'
	| 'gauge'
	| 'sparkline'
	| 'heatmap'
	| 'divergingBarChart'
	| 'metric'
	| 'map'
	| 'schema';

export interface Position {
	gridColumn: number;
	gridRow: number;
}

export interface Size {
	colSpan: number;
	rowSpan: number;
}

export interface WidgetConstraints {
	minWidth?: number;
	minHeight?: number;
	maxWidth?: number;
	maxHeight?: number;
}

export interface BaseWidget extends Position, Size, WidgetConstraints {
	id: string;
	type: WidgetType;
	locked?: boolean;
	title?: string; // Optional widget title for display
	description?: string; // Optional widget description
	topicOverride?: string; // Optional topic override - if set, widget subscribes to this topic instead of default
}

// Widget Action Types
export type WidgetAction =
	| 'configure'
	| 'customInstructions'
	| 'edit'
	| 'duplicate'
	| 'lock'
	| 'unlock'
	| 'bringToFront'
	| 'sendToBack'
	| 'exportData'
	| 'refresh'
	| 'settings'
	| 'remove';

export interface TableWidget extends BaseWidget {
	type: 'table';
	data: {
		title?: string;
		headers: string[];
		rows: Array<Record<string, any>>;
		sortable?: boolean;
		paginated?: boolean;
	};
}

export interface TitleWidget extends BaseWidget {
	type: 'title';
	data: {
		title: string;
		subtitle?: string;
		alignment?: 'left' | 'center' | 'right';
	};
}

export interface ParagraphWidget extends BaseWidget {
	type: 'paragraph';
	data: {
		title?: string | null;
		content: string;
		markdown?: boolean | null;
	};
}

export interface ImageWidget extends BaseWidget {
	type: 'image';
	data: {
		title?: string;
		src: string;
		alt: string;
		objectFit?: 'cover' | 'contain' | 'fill';
	};
}

export interface LineChartWidget extends BaseWidget {
	type: 'lineChart';
	data: {
		datasets: Array<{
			label: string;
			data: number[];
			color?: string;
		}>;
		labels: string[];
		options?: {
			responsive?: boolean;
			maintainAspectRatio?: boolean;
		};
	};
}

export interface BarChartWidget extends BaseWidget {
	type: 'barChart';
	data: {
		datasets: Array<{
			label: string;
			data: number[];
			backgroundColor?: string;
		}>;
		labels: string[];
		orientation?: 'vertical' | 'horizontal';
	};
}

export interface DonutChartWidget extends BaseWidget {
	type: 'donutChart';
	data: {
		labels: string[];
		values: number[];
		colors?: string[];
		centerLabel?: string;
	};
}

export interface AreaChartWidget extends BaseWidget {
	type: 'areaChart';
	data: {
		labels: string[];
		datasets: Array<{
			label: string;
			data: number[];
			color?: string;
		}>;
	};
}

export interface GaugeWidget extends BaseWidget {
	type: 'gauge';
	data: {
		value: number;
		min?: number;
		max?: number;
		label?: string;
		unit?: string;
		color?: string;
	};
}

export interface SparklineWidget extends BaseWidget {
	type: 'sparkline';
	data: {
		values: number[];
		label?: string;
		color?: string;
	};
}

export interface HeatmapWidget extends BaseWidget {
	type: 'heatmap';
	data: {
		rows: string[];
		cols: string[];
		values: number[][];
	};
}

export interface DivergingBarChartWidget extends BaseWidget {
	type: 'divergingBarChart';
	data: {
		labels: string[];
		values: number[]; // can be negative (left) or positive (right) from center
		positiveColor?: string;
		negativeColor?: string;
	};
}

export interface MapWidget extends BaseWidget {
	type: 'map';
	data: {
		title?: string;
		description?: string;
		lat: number;
		lon: number;
		zoom: number;
		mapType: 'leaflet' | 'google' | 'mapbox';
		apiKey: string;
	};
}

export interface SchemaWidget extends BaseWidget {
	type: 'schema';
	data: {
		schemaId: string; // Schema ID from SchemaRegistry
		data?: unknown; // Optional initial data
	};
}

export interface MetricWidget extends BaseWidget {
	type: 'metric';
	data: {
		label: string;
		value: string | number;
		change?: number;
		changeType?: 'increase' | 'decrease';
		unit?: string;
	};
}

export type Widget =
	| TableWidget
	| TitleWidget
	| ParagraphWidget
	| ImageWidget
	| LineChartWidget
	| BarChartWidget
	| DonutChartWidget
	| AreaChartWidget
	| GaugeWidget
	| SparklineWidget
	| HeatmapWidget
	| DivergingBarChartWidget
	| MetricWidget
	| MapWidget
	| SchemaWidget;

export interface DashboardConfig {
	gridColumns: number;
	gridRows: number;
	gap: number;
	minCellHeight: number;
}

export interface DragState {
	isDragging: boolean;
	activeWidgetId: string | null;
	ghostPosition: Position | null;
}

export interface ResizeState {
	isResizing: boolean;
	activeWidgetId: string | null;
	resizeHandle: 'right' | 'bottom' | 'corner' | null;
}
