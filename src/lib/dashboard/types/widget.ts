// Widget type definitions
// All widgets now use ValidatedTopicStore for reactive data binding with schema validation
import type { MetricWidgetData } from '@stratiqai/widget-metric';
import type { JsonViewerWidgetData } from '@stratiqai/widget-json-viewer';
import type { BrokerCardWidgetData } from '@stratiqai/widget-broker-card';
import type { LqAnalysisConfig } from '@stratiqai/widget-lq-analysis';
import type { ProFormaRevenueConfig } from '@stratiqai/widget-pro-forma-revenue';
import type { ProFormaOpExConfig } from '@stratiqai/widget-pro-forma-opex';
import type { ProFormaNoiConfig } from '@stratiqai/widget-pro-forma-noi';
import type { ProFormaUnleveredCfConfig } from '@stratiqai/widget-pro-forma-unlevered-cf';
import type { ProFormaLeveredCfConfig } from '@stratiqai/widget-pro-forma-levered-cf';
import type { ProFormaUnleveredReturnsConfig } from '@stratiqai/widget-pro-forma-unlevered-returns';
import type { ProFormaLeveredReturnsConfig } from '@stratiqai/widget-pro-forma-levered-returns';
import type { EconBaseMultiplierConfig } from '@stratiqai/widget-econ-base-multiplier';
import type { IndustryTrendScorecardConfig } from '@stratiqai/widget-industry-trend-scorecard';
import type { LfprDashboardConfig } from '@stratiqai/widget-lfpr-dashboard';
import type { Mapbox3dConfig } from '@stratiqai/widget-mapbox-3d';
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
	| 'schema'
	| 'locationQuotient'
	| 'jsonViewer'
	| 'brokerCard'
	| 'lqAnalysis'
	| 'proFormaRevenue'
	| 'proFormaOpEx'
	| 'proFormaNoi'
	| 'proFormaUnleveredCf'
	| 'proFormaLeveredCf'
	| 'proFormaUnleveredReturns'
	| 'proFormaLeveredReturns'
	| 'econBaseMultiplier'
	| 'industryTrendScorecard'
	| 'lfprDashboard'
	| 'mapbox3d';

/** Accepts any registered WidgetType plus unknown strings from package widgets. */
export type AnyWidgetType = WidgetType | (string & {});

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
	type: AnyWidgetType;
	locked?: boolean;
	title?: string;
	description?: string;
	topicOverride?: string;
	promptId?: string;
	entityDefinitionId?: string;
	entityInstanceId?: string;
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
	| 'remove'
	| 'viewFullscreen'
	| 'aiConfiguration';

export interface TableWidget extends BaseWidget {
	type: 'table';
	data: {
		title?: string;
		description?: string;
		headers?: string[];
		columns?: Array<{
			key: string;
			label?: string;
			type?: 'text' | 'number' | 'currency' | 'percent';
			align?: 'left' | 'center' | 'right';
			width?: string;
		}>;
		rows: Array<Record<string, any>>;
		sortable?: boolean;
		paginated?: boolean;
		pageSize?: number;
		searchable?: boolean;
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

import type { ImageWidgetData } from '@stratiqai/widget-image';
import type { LineChartWidgetData } from '@stratiqai/widget-line-chart';
import type { BarChartWidgetData } from '@stratiqai/widget-bar-chart';
import type { DonutChartWidgetData } from '@stratiqai/widget-donut-chart';
import type { AreaChartWidgetData } from '@stratiqai/widget-area-chart';
import type { GaugeWidgetData } from '@stratiqai/widget-gauge';
import type { SparklineWidgetData } from '@stratiqai/widget-sparkline';
import type { HeatmapWidgetData } from '@stratiqai/widget-heatmap';
import type { DivergingBarChartWidgetData } from '@stratiqai/widget-diverging-bar-chart';
import type { MapWidgetData } from '@stratiqai/widget-map';
import type { SchemaWidgetData } from '@stratiqai/widget-schema';
import type { LocationQuotientWidgetData } from '@stratiqai/widget-location-quotient';

export interface ImageWidget extends BaseWidget {
	type: 'image';
	data: ImageWidgetData;
}

export interface LineChartWidget extends BaseWidget {
	type: 'lineChart';
	data: LineChartWidgetData;
}

export interface BarChartWidget extends BaseWidget {
	type: 'barChart';
	data: BarChartWidgetData;
}

export interface DonutChartWidget extends BaseWidget {
	type: 'donutChart';
	data: DonutChartWidgetData;
}

export interface AreaChartWidget extends BaseWidget {
	type: 'areaChart';
	data: AreaChartWidgetData;
}

export interface GaugeWidget extends BaseWidget {
	type: 'gauge';
	data: GaugeWidgetData;
}

export interface SparklineWidget extends BaseWidget {
	type: 'sparkline';
	data: SparklineWidgetData;
}

export interface HeatmapWidget extends BaseWidget {
	type: 'heatmap';
	data: HeatmapWidgetData;
}

export interface DivergingBarChartWidget extends BaseWidget {
	type: 'divergingBarChart';
	data: DivergingBarChartWidgetData;
}

export interface MapWidget extends BaseWidget {
	type: 'map';
	data: MapWidgetData;
}

export interface SchemaWidget extends BaseWidget {
	type: 'schema';
	data: SchemaWidgetData;
}

export interface MetricWidget extends BaseWidget {
	type: 'metric';
	data: MetricWidgetData;
}

export interface JsonViewerWidget extends BaseWidget {
	type: 'jsonViewer';
	data: JsonViewerWidgetData;
}

export interface BrokerCardWidget extends BaseWidget {
	type: 'brokerCard';
	data: BrokerCardWidgetData;
}

export type { LocationQuotientSortOrder } from '@stratiqai/widget-location-quotient';

export interface LocationQuotientWidget extends BaseWidget {
	type: 'locationQuotient';
	data: LocationQuotientWidgetData;
}

export interface LqAnalysisWidgetDef extends BaseWidget {
	type: 'lqAnalysis';
	data: LqAnalysisConfig;
}

export interface ProFormaRevenueWidgetDef extends BaseWidget {
	type: 'proFormaRevenue';
	data: ProFormaRevenueConfig;
}

export interface ProFormaOpExWidgetDef extends BaseWidget {
	type: 'proFormaOpEx';
	data: ProFormaOpExConfig;
}

export interface ProFormaNoiWidgetDef extends BaseWidget {
	type: 'proFormaNoi';
	data: ProFormaNoiConfig;
}

export interface ProFormaUnleveredCfWidgetDef extends BaseWidget {
	type: 'proFormaUnleveredCf';
	data: ProFormaUnleveredCfConfig;
}

export interface ProFormaLeveredCfWidgetDef extends BaseWidget {
	type: 'proFormaLeveredCf';
	data: ProFormaLeveredCfConfig;
}

export interface ProFormaUnleveredReturnsWidgetDef extends BaseWidget {
	type: 'proFormaUnleveredReturns';
	data: ProFormaUnleveredReturnsConfig;
}

export interface ProFormaLeveredReturnsWidgetDef extends BaseWidget {
	type: 'proFormaLeveredReturns';
	data: ProFormaLeveredReturnsConfig;
}

export interface EconBaseMultiplierWidgetDef extends BaseWidget {
	type: 'econBaseMultiplier';
	data: EconBaseMultiplierConfig;
}

export interface IndustryTrendScorecardWidgetDef extends BaseWidget {
	type: 'industryTrendScorecard';
	data: IndustryTrendScorecardConfig;
}

export interface LfprDashboardWidgetDef extends BaseWidget {
	type: 'lfprDashboard';
	data: LfprDashboardConfig;
}

export interface Mapbox3dWidgetDef extends BaseWidget {
	type: 'mapbox3d';
	data: Mapbox3dConfig;
}

export interface GenericWidget extends BaseWidget {
	type: string;
	data: Record<string, unknown>;
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
	| SchemaWidget
	| LocationQuotientWidget
	| JsonViewerWidget
	| BrokerCardWidget
	| LqAnalysisWidgetDef
	| ProFormaRevenueWidgetDef
	| ProFormaOpExWidgetDef
	| ProFormaNoiWidgetDef
	| ProFormaUnleveredCfWidgetDef
	| ProFormaLeveredCfWidgetDef
	| ProFormaUnleveredReturnsWidgetDef
	| ProFormaLeveredReturnsWidgetDef
	| EconBaseMultiplierWidgetDef
	| IndustryTrendScorecardWidgetDef
	| LfprDashboardWidgetDef
	| Mapbox3dWidgetDef
	| GenericWidget;

export interface DashboardConfig {
	gridColumns: number;
	gridRows: number;
	gap: number;
	minCellHeight: number;
}

/** Default grid settings shared by the dashboard store and new tab slices */
export const DEFAULT_DASHBOARD_CONFIG: DashboardConfig = {
	gridColumns: 12,
	gridRows: 8,
	gap: 16,
	minCellHeight: 100
} as const;

export interface DragState {
	isDragging: boolean;
	activeWidgetId: string | null;
	ghostPosition: Position | null;
	/** Grid-cell offset from the grab point to the widget's top-left cell */
	dragCellOffset: { col: number; row: number } | null;
}

export interface ResizeState {
	isResizing: boolean;
	activeWidgetId: string | null;
	resizeHandle: 'right' | 'bottom' | 'corner' | null;
}

