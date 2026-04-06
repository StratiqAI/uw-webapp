// Widget Schema Registry with Zod
// This file defines Zod schemas for widget data and provides type-safe bridges
// between AI JobSubmission, ValidatedTopicStore, and widget components.
// All widgets now use ValidatedTopicStore for reactive data binding with schema validation.

import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { zodTextFormat } from 'openai/helpers/zod';
import type { WidgetType } from './widget';
import { getWidgetManifest } from '$lib/dashboard/setup/widgetRegistry';
import type { MetricWidgetData } from '@stratiqai/widget-metric';
import { metricWidgetDataSchema as MetricWidgetDataSchema } from '@stratiqai/widget-metric';
import type { JsonViewerWidgetData } from '@stratiqai/widget-json-viewer';
import { jsonViewerWidgetDataSchema as JsonViewerWidgetDataSchema } from '@stratiqai/widget-json-viewer';
import type { BrokerCardWidgetData } from '@stratiqai/widget-broker-card';
import { brokerCardWidgetDataSchema as BrokerCardWidgetDataSchema } from '@stratiqai/widget-broker-card';
import type { LqAnalysisConfig } from '@stratiqai/widget-lq-analysis';
import { lqAnalysisConfigSchema as LqAnalysisConfigSchema } from '@stratiqai/widget-lq-analysis';
import type { EconBaseMultiplierConfig } from '@stratiqai/widget-econ-base-multiplier';
import { econBaseMultiplierConfigSchema as EconBaseMultiplierConfigSchema } from '@stratiqai/widget-econ-base-multiplier';
import type { IndustryTrendScorecardConfig } from '@stratiqai/widget-industry-trend-scorecard';
import { industryTrendScorecardConfigSchema as IndustryTrendScorecardConfigSchema } from '@stratiqai/widget-industry-trend-scorecard';
import type { LfprDashboardConfig } from '@stratiqai/widget-lfpr-dashboard';
import { lfprDashboardConfigSchema as LfprDashboardConfigSchema } from '@stratiqai/widget-lfpr-dashboard';
import type { Mapbox3dConfig } from '@stratiqai/widget-mapbox-3d';
import { mapbox3dConfigSchema as Mapbox3dConfigSchema } from '@stratiqai/widget-mapbox-3d';
import { imageWidgetDataSchema as ImageWidgetDataSchema } from '@stratiqai/widget-image';
import { lineChartWidgetDataSchema as LineChartWidgetDataSchema } from '@stratiqai/widget-line-chart';
import { barChartWidgetDataSchema as BarChartWidgetDataSchema } from '@stratiqai/widget-bar-chart';
import { donutChartWidgetDataSchema as DonutChartWidgetDataSchema } from '@stratiqai/widget-donut-chart';
import { areaChartWidgetDataSchema as AreaChartWidgetDataSchema } from '@stratiqai/widget-area-chart';
import { gaugeWidgetDataSchema as GaugeWidgetDataSchema } from '@stratiqai/widget-gauge';
import { sparklineWidgetDataSchema as SparklineWidgetDataSchema } from '@stratiqai/widget-sparkline';
import { heatmapWidgetDataSchema as HeatmapWidgetDataSchema } from '@stratiqai/widget-heatmap';
import { divergingBarChartWidgetDataSchema as DivergingBarChartWidgetDataSchema } from '@stratiqai/widget-diverging-bar-chart';
import { mapWidgetDataSchema as MapWidgetDataSchema } from '@stratiqai/widget-map';
import { schemaWidgetDataSchema as SchemaWidgetDataSchema } from '@stratiqai/widget-schema';
import { locationQuotientWidgetDataSchema as LocationQuotientWidgetDataSchema } from '@stratiqai/widget-location-quotient';
import { createLogger } from '$lib/utils/logger';

const log = createLogger('widgets');

export type { MetricWidgetData, JsonViewerWidgetData, BrokerCardWidgetData };

// ===== Zod Schemas for Widget Data =====

export const ParagraphWidgetDataSchema = z.object({
	title: z.string().nullable().optional(),
	content: z.string().min(1, 'Content is required'),
	markdown: z.boolean().nullable().default(false)
});

export const TableWidgetDataSchema = z.object({
	title: z.string().nullable().optional(),
	headers: z.array(z.string()),
	rows: z.array(z.record(z.string(), z.any())),
	sortable: z.boolean().nullable().optional(),
	paginated: z.boolean().nullable().optional()
});

export const TitleWidgetDataSchema = z.object({
	title: z.string(),
	subtitle: z.string().nullable().optional(),
	alignment: z.enum(['left', 'center', 'right']).nullable().optional()
});

export {
	ImageWidgetDataSchema,
	LineChartWidgetDataSchema,
	BarChartWidgetDataSchema,
	DonutChartWidgetDataSchema,
	AreaChartWidgetDataSchema,
	GaugeWidgetDataSchema,
	SparklineWidgetDataSchema,
	HeatmapWidgetDataSchema,
	DivergingBarChartWidgetDataSchema,
	MetricWidgetDataSchema,
	JsonViewerWidgetDataSchema,
	BrokerCardWidgetDataSchema,
	MapWidgetDataSchema,
	SchemaWidgetDataSchema,
	LocationQuotientWidgetDataSchema
};

// ===== Schema Registry =====

export const WidgetDataSchemas = {
	paragraph: ParagraphWidgetDataSchema,
	table: TableWidgetDataSchema,
	title: TitleWidgetDataSchema,
	image: ImageWidgetDataSchema,
	lineChart: LineChartWidgetDataSchema,
	barChart: BarChartWidgetDataSchema,
	donutChart: DonutChartWidgetDataSchema,
	areaChart: AreaChartWidgetDataSchema,
	gauge: GaugeWidgetDataSchema,
	sparkline: SparklineWidgetDataSchema,
	heatmap: HeatmapWidgetDataSchema,
	divergingBarChart: DivergingBarChartWidgetDataSchema,
	metric: MetricWidgetDataSchema,
	map: MapWidgetDataSchema,
	schema: SchemaWidgetDataSchema,
	locationQuotient: LocationQuotientWidgetDataSchema,
	jsonViewer: JsonViewerWidgetDataSchema,
	brokerCard: BrokerCardWidgetDataSchema,
	lqAnalysis: LqAnalysisConfigSchema,
	econBaseMultiplier: EconBaseMultiplierConfigSchema,
	industryTrendScorecard: IndustryTrendScorecardConfigSchema,
	lfprDashboard: LfprDashboardConfigSchema,
	mapbox3d: Mapbox3dConfigSchema
} as const;

/**
 * Extensible schema lookup: checks the hardcoded registry first, then falls
 * back to the dynamic widget manifest registry for package-based widgets.
 */
export function getWidgetSchema(widgetType: string): z.ZodSchema | undefined {
	if (widgetType in WidgetDataSchemas) {
		return WidgetDataSchemas[widgetType as keyof typeof WidgetDataSchemas];
	}
	const manifest = getWidgetManifest(widgetType);
	return manifest?.zodSchema ?? manifest?.inputSchema;
}

// ===== Inferred Types from Schemas =====

export type ParagraphWidgetData = z.infer<typeof ParagraphWidgetDataSchema>;
export type TableWidgetData = z.infer<typeof TableWidgetDataSchema>;
export type TitleWidgetData = z.infer<typeof TitleWidgetDataSchema>;
export type { ImageWidgetData } from '@stratiqai/widget-image';
export type { LineChartWidgetData } from '@stratiqai/widget-line-chart';
export type { BarChartWidgetData } from '@stratiqai/widget-bar-chart';
export type { DonutChartWidgetData } from '@stratiqai/widget-donut-chart';
export type { AreaChartWidgetData } from '@stratiqai/widget-area-chart';
export type { GaugeWidgetData } from '@stratiqai/widget-gauge';
export type { SparklineWidgetData } from '@stratiqai/widget-sparkline';
export type { HeatmapWidgetData } from '@stratiqai/widget-heatmap';
export type { DivergingBarChartWidgetData } from '@stratiqai/widget-diverging-bar-chart';
export type { MapWidgetData } from '@stratiqai/widget-map';
export type { SchemaWidgetData } from '@stratiqai/widget-schema';
export type { LocationQuotientWidgetData } from '@stratiqai/widget-location-quotient';
export type LqAnalysisWidgetData = z.infer<typeof LqAnalysisConfigSchema>;
export type EconBaseMultiplierWidgetData = z.infer<typeof EconBaseMultiplierConfigSchema>;
export type IndustryTrendScorecardWidgetData = z.infer<typeof IndustryTrendScorecardConfigSchema>;
export type LfprDashboardWidgetData = z.infer<typeof LfprDashboardConfigSchema>;
export type Mapbox3dWidgetData = z.infer<typeof Mapbox3dConfigSchema>;

// Union type of all widget data
export type WidgetData =
	| ParagraphWidgetData
	| TableWidgetData
	| TitleWidgetData
	| ImageWidgetData
	| LineChartWidgetData
	| BarChartWidgetData
	| DonutChartWidgetData
	| AreaChartWidgetData
	| GaugeWidgetData
	| SparklineWidgetData
	| HeatmapWidgetData
	| DivergingBarChartWidgetData
	| MetricWidgetData
	| MapWidgetData
	| SchemaWidgetData
	| LocationQuotientWidgetData
	| JsonViewerWidgetData
	| BrokerCardWidgetData
	| LqAnalysisWidgetData
	| EconBaseMultiplierWidgetData
	| IndustryTrendScorecardWidgetData
	| LfprDashboardWidgetData
	| Mapbox3dWidgetData;

// ===== Type-safe Widget Data Mapping =====

export interface WidgetDataTypeMap {
	paragraph: ParagraphWidgetData;
	table: TableWidgetData;
	title: TitleWidgetData;
	image: ImageWidgetData;
	lineChart: LineChartWidgetData;
	barChart: BarChartWidgetData;
	donutChart: DonutChartWidgetData;
	areaChart: AreaChartWidgetData;
	gauge: GaugeWidgetData;
	sparkline: SparklineWidgetData;
	heatmap: HeatmapWidgetData;
	divergingBarChart: DivergingBarChartWidgetData;
	metric: MetricWidgetData;
	map: MapWidgetData;
	schema: SchemaWidgetData;
	locationQuotient: LocationQuotientWidgetData;
	jsonViewer: JsonViewerWidgetData;
	brokerCard: BrokerCardWidgetData;
	lqAnalysis: LqAnalysisConfig;
	econBaseMultiplier: EconBaseMultiplierConfig;
	industryTrendScorecard: IndustryTrendScorecardConfig;
	lfprDashboard: LfprDashboardConfig;
	mapbox3d: Mapbox3dConfig;
}

// ===== Widget Channel Configuration =====

/**
 * Configuration for a widget's data channel in ValidatedTopicStore
 * @template T - The widget type
 */
export interface WidgetChannelConfig<T extends WidgetType = WidgetType> {
	/** Unique identifier for this data channel */
	readonly channelId: string;
	/** Widget type this channel is for */
	readonly widgetType: T;
	/** Zod schema for validating data */
	readonly schema: z.ZodSchema<WidgetDataTypeMap[T]>;
	/** Optional description for debugging */
	readonly description?: string;
}

// ===== OpenAI Structured Output Configuration =====

/**
 * Configuration for OpenAI structured output (Legacy - use zodTextFormat instead)
 * @deprecated Use getWidgetTextFormat() for OpenAI text format
 */
export interface OpenAIStructuredOutputConfig {
	type: 'json_schema';
	json_schema: {
		name: string;
		description?: string;
		schema: Record<string, unknown>;
		strict?: boolean;
	};
}

/**
 * OpenAI Text Format Configuration
 * This is the correct format for OpenAI structured outputs
 * Use this in the job input's `text.format` field
 */
export interface OpenAITextFormatConfig {
	type: 'json_schema';
	name: string;
	strict: true;
	schema: Record<string, unknown>;
}

/**
 * Convert a Zod schema to OpenAI structured output format
 * @param name - Name for the schema
 * @param schema - Zod schema to convert
 * @param description - Optional description
 * @returns OpenAI structured output configuration
 * 
 * @example
 * ```typescript
 * const openAIConfig = zodSchemaToOpenAI(
 *   'ParagraphContent',
 *   ParagraphWidgetDataSchema,
 *   'Content for a paragraph widget'
 * );
 * 
 * // Use with OpenAI API:
 * const response = await openai.chat.completions.create({
 *   model: 'gpt-4o',
 *   messages: [...],
 *   response_format: openAIConfig
 * });
 * ```
 */
export function zodSchemaToOpenAI<T extends z.ZodSchema>(
	name: string,
	schema: T,
	description?: string
): OpenAIStructuredOutputConfig {
	log.debug(`\n🔧 [zodSchemaToOpenAI] Converting Zod schema to OpenAI format`);
	log.debug(`   Name: ${name}`);
	log.debug(`   Description: ${description || '(none)'}`);
	
	// Convert Zod schema to JSON Schema
	const jsonSchema = zodToJsonSchema(schema, {
		name,
		$refStrategy: 'none' // Inline all references for OpenAI compatibility
	});

	// Extract the schema object (remove $schema property if present)
	const { $schema, ...schemaObject } = jsonSchema as any;

	log.debug(`   ✅ Conversion complete`);

	return {
		type: 'json_schema',
		json_schema: {
			name,
			description,
			schema: schemaObject,
			strict: true
		}
	};
}

/**
 * Get OpenAI text format for a specific widget type
 * This uses zodTextFormat which is the recommended way for OpenAI structured outputs
 * 
 * @param widgetType - The widget type
 * @param name - Optional custom name (defaults to widgetType)
 * @returns OpenAI text format configuration for use in job input
 * 
 * @example
 * ```typescript
 * const textFormat = getWidgetTextFormat('paragraph', 'ParagraphContent');
 * 
 * // Use in job input:
 * const jobInput = {
 *   model: 'gpt-4o-mini',
 *   input: [{ role: 'system', content: 'Generate content...' }],
 *   text: { format: textFormat }
 * };
 * ```
 */
export function getWidgetTextFormat<T extends WidgetType>(
	widgetType: T,
	name?: string
): OpenAITextFormatConfig {
	log.debug(`\n🔧 [getWidgetTextFormat] Getting OpenAI text format for widget type: ${widgetType}`);
	const schema = WidgetDataSchemas[widgetType];
	const configName = name || `${widgetType}WidgetData`;
	
	log.debug(`   Using zodTextFormat with name: ${configName}`);
	const textFormat = zodTextFormat(schema, configName);
	log.debug(`   ✅ Text format generated`);
	
	return textFormat as OpenAITextFormatConfig;
}

// ===== Validated Data Publisher =====

/**
 * Create a validated publisher for widget data
 * This ensures that data published to ValidatedTopicStore is validated against the schema
 */
export interface ValidatedPublisher<T = any> {
	/**
	 * Publish data with validation
	 * @throws {z.ZodError} if validation fails
	 */
	publish(data: T): void;
	/**
	 * Publish data with safe validation (returns error instead of throwing)
	 */
	safeParse(data: unknown): { success: true; data: T } | { success: false; error: z.ZodError };
	/** Clear the published data */
	clear(): void;
}

/**
 * Create a validated consumer for widget data
 * This ensures that data received from ValidatedTopicStore is validated
 */
export interface ValidatedConsumer<T = any> {
	/**
	 * Subscribe to validated data
	 * Invalid data will be filtered out and logged
	 */
	subscribe(callback: (data: T | undefined) => void): () => void;
	/** Get current validated data */
	get(): T | undefined;
}

// ===== Widget Data Bridge Configuration =====

/**
 * Configuration for AI Job -> Widget data flow
 */
export interface WidgetDataBridgeConfig<T extends WidgetType = WidgetType> {
	/** Job ID to listen for updates from */
	readonly jobId: string;
	/** Channel configuration for the widget */
	readonly channel: WidgetChannelConfig<T>;
	/** Optional transformer to convert job result to widget data */
	readonly transformer?: (jobResult: string) => any;
	/** Optional filter to determine which job updates to process */
	readonly filter?: (update: { status: string; result: string | null }) => boolean;
}

// ===== Validation Helpers =====

/**
 * Validate widget data against its schema
 */
export function validateWidgetData<T extends WidgetType>(
	widgetType: T,
	data: unknown
): { success: true; data: WidgetDataTypeMap[T] } | { success: false; error: z.ZodError } {
	log.debug(`\n🔧 [validateWidgetData] Validating data for widget type: ${widgetType}`);
	const schema = WidgetDataSchemas[widgetType];
	const result = schema.safeParse(data) as any;
	log.debug(`   Result: ${result.success ? '✅ Valid' : '❌ Invalid'}`);
	return result;
}

/**
 * Parse and validate widget data, throwing on error
 */
export function parseWidgetData<T extends WidgetType>(
	widgetType: T,
	data: unknown
): WidgetDataTypeMap[T] {
	log.debug(`\n🔧 [parseWidgetData] Parsing data for widget type: ${widgetType}`);
	const schema = WidgetDataSchemas[widgetType];
	// Type assertion needed due to TypeScript's limitations with indexed schema types
	// Runtime validation by Zod ensures type safety
	try {
		const result = schema.parse(data) as any;
		log.debug(`   ✅ Parse successful`);
		return result;
	} catch (error) {
		log.error(`   ❌ Parse failed:`, error);
		throw error;
	}
}

// ===== Preset Channel Configurations =====

/**
 * Channel configuration factory for all widget types
 * Use these to create type-safe channel configurations
 */
export const WidgetChannels = {
	/** Legacy preset - use factory functions below instead */
	paragraphContent: {
		channelId: 'paragraph-content',
		widgetType: 'paragraph',
		schema: ParagraphWidgetDataSchema,
		description: 'Channel for paragraph widget content'
	} as WidgetChannelConfig<'paragraph'>,

	/** Legacy preset - use factory functions below instead */
	tableData: {
		channelId: 'table-data',
		widgetType: 'table',
		schema: TableWidgetDataSchema,
		description: 'Channel for table widget data'
	} as WidgetChannelConfig<'table'>,

	/** Legacy preset - use factory functions below instead */
	metricData: {
		channelId: 'metric-data',
		widgetType: 'metric',
		schema: MetricWidgetDataSchema,
		description: 'Channel for metric widget data'
	} as WidgetChannelConfig<'metric'>,

	/** Legacy preset - use factory functions below instead */
	chartData: {
		channelId: 'chart-data',
		widgetType: 'lineChart',
		schema: LineChartWidgetDataSchema,
		description: 'Channel for chart widget data'
	} as WidgetChannelConfig<'lineChart'>,

	// ===== Channel Factory Functions =====

	/**
	 * Create a paragraph widget channel configuration
	 * @param channelId - Unique channel identifier
	 * @param description - Optional description
	 */
	paragraph: (channelId: string, description?: string): WidgetChannelConfig<'paragraph'> => ({
		channelId,
		widgetType: 'paragraph' as const,
		schema: ParagraphWidgetDataSchema as any,
		description: description || `Paragraph channel: ${channelId}`
	}),

	/**
	 * Create a table widget channel configuration
	 * @param channelId - Unique channel identifier
	 * @param description - Optional description
	 */
	table: (channelId: string, description?: string): WidgetChannelConfig<'table'> => ({
		channelId,
		widgetType: 'table',
		schema: TableWidgetDataSchema,
		description: description || `Table channel: ${channelId}`
	}),

	/**
	 * Create a title widget channel configuration
	 * @param channelId - Unique channel identifier
	 * @param description - Optional description
	 */
	title: (channelId: string, description?: string): WidgetChannelConfig<'title'> => ({
		channelId,
		widgetType: 'title',
		schema: TitleWidgetDataSchema,
		description: description || `Title channel: ${channelId}`
	}),

	/**
	 * Create an image widget channel configuration
	 * @param channelId - Unique channel identifier
	 * @param description - Optional description
	 */
	image: (channelId: string, description?: string): WidgetChannelConfig<'image'> => ({
		channelId,
		widgetType: 'image',
		schema: ImageWidgetDataSchema,
		description: description || `Image channel: ${channelId}`
	}),

	/**
	 * Create a line chart widget channel configuration
	 * @param channelId - Unique channel identifier
	 * @param description - Optional description
	 */
	lineChart: (channelId: string, description?: string): WidgetChannelConfig<'lineChart'> => ({
		channelId,
		widgetType: 'lineChart',
		schema: LineChartWidgetDataSchema,
		description: description || `Line chart channel: ${channelId}`
	}),

	/**
	 * Create a bar chart widget channel configuration
	 * @param channelId - Unique channel identifier
	 * @param description - Optional description
	 */
	barChart: (channelId: string, description?: string): WidgetChannelConfig<'barChart'> => ({
		channelId,
		widgetType: 'barChart',
		schema: BarChartWidgetDataSchema,
		description: description || `Bar chart channel: ${channelId}`
	}),

	donutChart: (channelId: string, description?: string): WidgetChannelConfig<'donutChart'> => ({
		channelId,
		widgetType: 'donutChart',
		schema: DonutChartWidgetDataSchema,
		description: description || `Donut chart channel: ${channelId}`
	}),

	areaChart: (channelId: string, description?: string): WidgetChannelConfig<'areaChart'> => ({
		channelId,
		widgetType: 'areaChart',
		schema: AreaChartWidgetDataSchema,
		description: description || `Area chart channel: ${channelId}`
	}),

	gauge: (channelId: string, description?: string): WidgetChannelConfig<'gauge'> => ({
		channelId,
		widgetType: 'gauge',
		schema: GaugeWidgetDataSchema,
		description: description || `Gauge channel: ${channelId}`
	}),

	sparkline: (channelId: string, description?: string): WidgetChannelConfig<'sparkline'> => ({
		channelId,
		widgetType: 'sparkline',
		schema: SparklineWidgetDataSchema,
		description: description || `Sparkline channel: ${channelId}`
	}),

	heatmap: (channelId: string, description?: string): WidgetChannelConfig<'heatmap'> => ({
		channelId,
		widgetType: 'heatmap',
		schema: HeatmapWidgetDataSchema,
		description: description || `Heatmap channel: ${channelId}`
	}),

	divergingBarChart: (channelId: string, description?: string): WidgetChannelConfig<'divergingBarChart'> => ({
		channelId,
		widgetType: 'divergingBarChart',
		schema: DivergingBarChartWidgetDataSchema,
		description: description || `Diverging bar chart channel: ${channelId}`
	}),

	/**
	 * Create a metric widget channel configuration
	 * @param channelId - Unique channel identifier
	 * @param description - Optional description
	 */
	metric: (channelId: string, description?: string): WidgetChannelConfig<'metric'> => ({
		channelId,
		widgetType: 'metric',
		schema: MetricWidgetDataSchema,
		description: description || `Metric channel: ${channelId}`
	}),

	/**
	 * Create a map widget channel configuration
	 * @param channelId - Unique channel identifier
	 * @param description - Optional description
	 */
	map: (channelId: string, description?: string): WidgetChannelConfig<'map'> => ({
		channelId,
		widgetType: 'map',
		schema: MapWidgetDataSchema,
		description: description || `Map channel: ${channelId}`
	}),

	locationQuotient: (channelId: string, description?: string): WidgetChannelConfig<'locationQuotient'> => ({
		channelId,
		widgetType: 'locationQuotient',
		schema: LocationQuotientWidgetDataSchema,
		description: description || `Location quotient channel: ${channelId}`
	}),

	jsonViewer: (channelId: string, description?: string): WidgetChannelConfig<'jsonViewer'> => ({
		channelId,
		widgetType: 'jsonViewer',
		schema: JsonViewerWidgetDataSchema,
		description: description || `JSON viewer channel: ${channelId}`
	}),

	brokerCard: (channelId: string, description?: string): WidgetChannelConfig<'brokerCard'> => ({
		channelId,
		widgetType: 'brokerCard',
		schema: BrokerCardWidgetDataSchema,
		description: description || `Broker card channel: ${channelId}`
	}),

	lqAnalysis: (channelId: string, description?: string): WidgetChannelConfig<'lqAnalysis'> => ({
		channelId,
		widgetType: 'lqAnalysis',
		schema: LqAnalysisConfigSchema,
		description: description || `LQ analysis channel: ${channelId}`
	}),

	econBaseMultiplier: (channelId: string, description?: string): WidgetChannelConfig<'econBaseMultiplier'> => ({
		channelId,
		widgetType: 'econBaseMultiplier',
		schema: EconBaseMultiplierConfigSchema,
		description: description || `Economic base multiplier channel: ${channelId}`
	}),

	industryTrendScorecard: (channelId: string, description?: string): WidgetChannelConfig<'industryTrendScorecard'> => ({
		channelId,
		widgetType: 'industryTrendScorecard',
		schema: IndustryTrendScorecardConfigSchema,
		description: description || `Industry trend scorecard channel: ${channelId}`
	}),

	lfprDashboard: (channelId: string, description?: string): WidgetChannelConfig<'lfprDashboard'> => ({
		channelId,
		widgetType: 'lfprDashboard',
		schema: LfprDashboardConfigSchema,
		description: description || `LFPR dashboard channel: ${channelId}`
	}),

	mapbox3d: (channelId: string, description?: string): WidgetChannelConfig<'mapbox3d'> => ({
		channelId,
		widgetType: 'mapbox3d',
		schema: Mapbox3dConfigSchema,
		description: description || `Mapbox 3D channel: ${channelId}`
	})
} as const;

// ===== Type Guards =====

export function isWidgetType(type: string): type is WidgetType {
	return type in WidgetDataSchemas;
}

export function hasWidgetSchema(type: WidgetType): type is keyof typeof WidgetDataSchemas {
	return type in WidgetDataSchemas;
}
