// ============================================================================
// Widget System - Core Type Definitions and Schemas
// ============================================================================

import { z } from 'zod';
import { zodTextFormat } from 'openai/helpers/zod';
import type { Readable, Writable } from 'svelte/store';

// ============================================================================
// Core Types and Constants
// ============================================================================

/**
 * Available widget types in the dashboard system
 */
export const WIDGET_TYPES = {
  TABLE: 'table',
  TITLE: 'title',
  PARAGRAPH: 'paragraph',
  IMAGE: 'image',
  LINE_CHART: 'lineChart',
  BAR_CHART: 'barChart',
  METRIC: 'metric',
  MAP: 'map',
} as const;

export type WidgetType = typeof WIDGET_TYPES[keyof typeof WIDGET_TYPES];

/**
 * Available widget actions
 */
export const WIDGET_ACTIONS = {
  CUSTOM_INSTRUCTIONS: 'customInstructions',
  EDIT: 'edit',
  DUPLICATE: 'duplicate',
  LOCK: 'lock',
  UNLOCK: 'unlock',
  BRING_TO_FRONT: 'bringToFront',
  SEND_TO_BACK: 'sendToBack',
  EXPORT_DATA: 'exportData',
  REFRESH: 'refresh',
  SETTINGS: 'settings',
  REMOVE: 'remove',
} as const;

export type WidgetAction = typeof WIDGET_ACTIONS[keyof typeof WIDGET_ACTIONS];

// ============================================================================
// Base Schemas
// ============================================================================

/**
 * Grid position coordinates schema
 */
export const PositionSchema = z.object({
  gridColumn: z.number().int().min(0).describe('Column position in grid'),
  gridRow: z.number().int().min(0).describe('Row position in grid'),
});

export type Position = z.infer<typeof PositionSchema>;

/**
 * Widget dimensions in grid units schema
 */
export const SizeSchema = z.object({
  colSpan: z.number().int().min(1).max(12).describe('Number of columns to span'),
  rowSpan: z.number().int().min(1).max(12).describe('Number of rows to span'),
});

export type Size = z.infer<typeof SizeSchema>;

/**
 * Constraints for widget sizing schema
 */
export const WidgetConstraintsSchema = z.object({
  minWidth: z.number().int().min(1).optional().describe('Minimum width in grid units'),
  minHeight: z.number().int().min(1).optional().describe('Minimum height in grid units'),
  maxWidth: z.number().int().min(1).optional().describe('Maximum width in grid units'),
  maxHeight: z.number().int().min(1).optional().describe('Maximum height in grid units'),
}).refine(
  (data) => {
    if (data.minWidth && data.maxWidth) return data.minWidth <= data.maxWidth;
    if (data.minHeight && data.maxHeight) return data.minHeight <= data.maxHeight;
    return true;
  },
  { message: 'Min values must be less than or equal to max values' }
);

export type WidgetConstraints = z.infer<typeof WidgetConstraintsSchema>;

/**
 * Data source configuration for AWS integration
 */
export const DataSourceSchema = z.object({
  type: z.enum(['cloudwatch', 's3', 'dynamodb', 'rds', 'custom']).describe('Data source type'),
  region: z.string().optional().describe('AWS region'),
  accountId: z.string().optional().describe('AWS account ID'),
  resourceArn: z.string().optional().describe('AWS resource ARN'),
  refreshInterval: z.number().int().min(0).optional().describe('Refresh interval in seconds'),
});

export type DataSource = z.infer<typeof DataSourceSchema>;

/**
 * Optional metadata for widgets
 */
export const WidgetMetadataSchema = z.object({
  createdAt: z.string().datetime().optional().describe('Creation timestamp'),
  updatedAt: z.string().datetime().optional().describe('Last update timestamp'),
  createdBy: z.string().optional().describe('User who created the widget'),
  tags: z.record(z.string(), z.string()).optional().describe('Key-value tags'),
  cloudWatchDashboard: z.string().optional().describe('CloudWatch dashboard reference'),
  dataSource: DataSourceSchema.optional().describe('Data source configuration'),
});

export type WidgetMetadata = z.infer<typeof WidgetMetadataSchema>;

/**
 * Base widget schema
 */
export const BaseWidgetSchema = z.object({
  id: z.string().min(1).describe('Unique widget identifier'),
  type: z.nativeEnum(WIDGET_TYPES).describe('Widget type'),
  position: PositionSchema.describe('Grid position'),
  size: SizeSchema.describe('Widget size'),
  constraints: WidgetConstraintsSchema.optional().describe('Size constraints'),
  locked: z.boolean().optional().describe('Whether widget is locked'),
  title: z.string().optional().describe('Widget title'),
  description: z.string().optional().describe('Widget description'),
  metadata: WidgetMetadataSchema.optional().describe('Widget metadata'),
});

export type BaseWidget = z.infer<typeof BaseWidgetSchema>;

// ============================================================================
// Widget Data Schemas
// ============================================================================

/**
 * Table widget data schema
 */
export const TableWidgetDataSchema = z.object({
  headers: z.array(z.string()).min(1).describe('Table column headers'),
  rows: z.array(z.record(z.string(), z.unknown())).describe('Table row data'),
  sortable: z.boolean().optional().default(false).describe('Enable column sorting'),
  paginated: z.boolean().optional().default(false).describe('Enable pagination'),
  pageSize: z.number().int().min(1).optional().default(10).describe('Rows per page'),
  sortColumn: z.string().optional().describe('Current sort column'),
  sortDirection: z.enum(['asc', 'desc']).optional().describe('Sort direction'),
});

export type TableWidgetData = z.infer<typeof TableWidgetDataSchema>;

/**
 * Title widget data schema
 */
export const TitleWidgetDataSchema = z.object({
  title: z.string().min(1).describe('Title text'),
  subtitle: z.string().optional().describe('Subtitle text'),
  alignment: z.enum(['left', 'center', 'right']).optional().default('left').describe('Text alignment'),
  level: z.enum([1, 2, 3, 4, 5, 6] as const).optional().default(1).describe('Heading level'),
});

export type TitleWidgetData = z.infer<typeof TitleWidgetDataSchema>;

/**
 * Paragraph widget data schema
 */
export const ParagraphWidgetDataSchema = z.object({
  content: z.string().min(1).describe('Paragraph content'),
  markdown: z.boolean().optional().default(false).describe('Enable markdown rendering'),
  truncate: z.boolean().optional().default(false).describe('Enable text truncation'),
  maxLines: z.number().int().min(1).optional().describe('Maximum lines to display'),
});

export type ParagraphWidgetData = z.infer<typeof ParagraphWidgetDataSchema>;

/**
 * Image widget data schema
 */
export const ImageWidgetDataSchema = z.object({
  src: z.string().url().or(z.string().startsWith('s3://')).describe('Image source URL'),
  alt: z.string().describe('Alternative text for accessibility'),
  objectFit: z.enum(['cover', 'contain', 'fill', 'none', 'scale-down']).optional().default('contain').describe('Image fit mode'),
  s3Bucket: z.string().optional().describe('S3 bucket name'),
  s3Key: z.string().optional().describe('S3 object key'),
});

export type ImageWidgetData = z.infer<typeof ImageWidgetDataSchema>;

/**
 * CloudWatch metric configuration
 */
export const CloudWatchMetricSchema = z.object({
  namespace: z.string().describe('CloudWatch namespace'),
  metricName: z.string().describe('Metric name'),
  dimensions: z.record(z.string(), z.string()).optional().describe('Metric dimensions'),
  stat: z.enum(['Average', 'Sum', 'SampleCount', 'Minimum', 'Maximum']).optional().default('Average').describe('Statistic type'),
  period: z.number().int().min(60).optional().default(300).describe('Period in seconds'),
});

export type CloudWatchMetric = z.infer<typeof CloudWatchMetricSchema>;

/**
 * Chart dataset schema
 */
export const ChartDatasetSchema = z.object({
  label: z.string().describe('Dataset label'),
  data: z.array(z.number()).describe('Data points'),
  color: z.string().optional().describe('Line/bar color'),
  backgroundColor: z.string().optional().describe('Fill color'),
  borderColor: z.string().optional().describe('Border color'),
  cloudWatchMetric: CloudWatchMetricSchema.optional().describe('CloudWatch metric source'),
});

export type ChartDataset = z.infer<typeof ChartDatasetSchema>;

/**
 * Chart options schema
 */
export const ChartOptionsSchema = z.object({
  responsive: z.boolean().optional().default(true).describe('Responsive sizing'),
  maintainAspectRatio: z.boolean().optional().default(true).describe('Maintain aspect ratio'),
  animation: z.boolean().optional().default(true).describe('Enable animations'),
  legend: z.object({
    display: z.boolean().optional().default(true).describe('Show legend'),
    position: z.enum(['top', 'bottom', 'left', 'right']).optional().default('top').describe('Legend position'),
  }).optional().describe('Legend configuration'),
});

export type ChartOptions = z.infer<typeof ChartOptionsSchema>;

/**
 * Axis configuration schema
 */
export const AxisConfigSchema = z.object({
  label: z.string().optional().describe('Axis label'),
  min: z.number().optional().describe('Minimum value'),
  max: z.number().optional().describe('Maximum value'),
  stepSize: z.number().positive().optional().describe('Step size'),
});

export type AxisConfig = z.infer<typeof AxisConfigSchema>;

/**
 * Line chart widget data schema
 */
export const LineChartWidgetDataSchema = z.object({
  datasets: z.array(ChartDatasetSchema).min(1).describe('Chart datasets'),
  labels: z.array(z.string()).min(1).describe('X-axis labels'),
  options: ChartOptionsSchema.optional().describe('Chart options'),
  yAxis: AxisConfigSchema.optional().describe('Y-axis configuration'),
  xAxis: AxisConfigSchema.optional().describe('X-axis configuration'),
});

export type LineChartWidgetData = z.infer<typeof LineChartWidgetDataSchema>;

/**
 * Bar chart widget data schema
 */
export const BarChartWidgetDataSchema = z.object({
  datasets: z.array(ChartDatasetSchema).min(1).describe('Chart datasets'),
  labels: z.array(z.string()).min(1).describe('X-axis labels'),
  orientation: z.enum(['vertical', 'horizontal']).optional().default('vertical').describe('Bar orientation'),
  options: ChartOptionsSchema.optional().describe('Chart options'),
  stacked: z.boolean().optional().default(false).describe('Stack bars'),
});

export type BarChartWidgetData = z.infer<typeof BarChartWidgetDataSchema>;

/**
 * Geographic coordinates schema
 */
export const GeoCoordinatesSchema = z.object({
  lat: z.number().min(-90).max(90).describe('Latitude'),
  lon: z.number().min(-180).max(180).describe('Longitude'),
});

export type GeoCoordinates = z.infer<typeof GeoCoordinatesSchema>;

/**
 * Map marker schema
 */
export const MapMarkerSchema = z.object({
  id: z.string().describe('Marker identifier'),
  position: GeoCoordinatesSchema.describe('Marker position'),
  label: z.string().optional().describe('Marker label'),
  icon: z.string().optional().describe('Marker icon URL'),
});

export type MapMarker = z.infer<typeof MapMarkerSchema>;

/**
 * Geographic bounds schema
 */
export const GeoBoundsSchema = z.object({
  north: z.number().min(-90).max(90).describe('North boundary'),
  south: z.number().min(-90).max(90).describe('South boundary'),
  east: z.number().min(-180).max(180).describe('East boundary'),
  west: z.number().min(-180).max(180).describe('West boundary'),
}).refine(
  (data) => data.north > data.south,
  { message: 'North must be greater than south' }
);

export type GeoBounds = z.infer<typeof GeoBoundsSchema>;

/**
 * Map widget data schema
 */
export const MapWidgetDataSchema = z.object({
  center: GeoCoordinatesSchema.describe('Map center'),
  zoom: z.number().min(0).max(20).describe('Zoom level'),
  mapType: z.enum(['leaflet', 'google', 'mapbox', 'aws-location']).default('leaflet').describe('Map provider'),
  apiKey: z.string().optional().describe('API key for map provider'),
  markers: z.array(MapMarkerSchema).optional().describe('Map markers'),
  bounds: GeoBoundsSchema.optional().describe('Map bounds'),
});

export type MapWidgetData = z.infer<typeof MapWidgetDataSchema>;

/**
 * Metric widget data schema
 */
export const MetricWidgetDataSchema = z.object({
  label: z.string().describe('Metric label'),
  value: z.union([z.string(), z.number()]).describe('Metric value'),
  change: z.number().optional().describe('Change percentage'),
  changeType: z.enum(['increase', 'decrease', 'neutral']).optional().describe('Change direction'),
  unit: z.string().optional().describe('Value unit'),
  format: z.enum(['number', 'currency', 'percentage', 'bytes']).optional().default('number').describe('Display format'),
  trend: z.array(z.number()).optional().describe('Historical trend data'),
  target: z.number().optional().describe('Target value'),
});

export type MetricWidgetData = z.infer<typeof MetricWidgetDataSchema>;

// ============================================================================
// Complete Widget Schemas
// ============================================================================

export const TableWidgetSchema = BaseWidgetSchema.extend({
  type: z.literal(WIDGET_TYPES.TABLE),
  data: TableWidgetDataSchema,
});

export const TitleWidgetSchema = BaseWidgetSchema.extend({
  type: z.literal(WIDGET_TYPES.TITLE),
  data: TitleWidgetDataSchema,
});

export const ParagraphWidgetSchema = BaseWidgetSchema.extend({
  type: z.literal(WIDGET_TYPES.PARAGRAPH),
  data: ParagraphWidgetDataSchema,
});

export const ImageWidgetSchema = BaseWidgetSchema.extend({
  type: z.literal(WIDGET_TYPES.IMAGE),
  data: ImageWidgetDataSchema,
});

export const LineChartWidgetSchema = BaseWidgetSchema.extend({
  type: z.literal(WIDGET_TYPES.LINE_CHART),
  data: LineChartWidgetDataSchema,
});

export const BarChartWidgetSchema = BaseWidgetSchema.extend({
  type: z.literal(WIDGET_TYPES.BAR_CHART),
  data: BarChartWidgetDataSchema,
});

export const MetricWidgetSchema = BaseWidgetSchema.extend({
  type: z.literal(WIDGET_TYPES.METRIC),
  data: MetricWidgetDataSchema,
});

export const MapWidgetSchema = BaseWidgetSchema.extend({
  type: z.literal(WIDGET_TYPES.MAP),
  data: MapWidgetDataSchema,
});

/**
 * Union schema for any widget type
 */
export const WidgetSchema = z.discriminatedUnion('type', [
  TableWidgetSchema,
  TitleWidgetSchema,
  ParagraphWidgetSchema,
  ImageWidgetSchema,
  LineChartWidgetSchema,
  BarChartWidgetSchema,
  MetricWidgetSchema,
  MapWidgetSchema,
]);

// ============================================================================
// Type Exports
// ============================================================================

export type TableWidget = z.infer<typeof TableWidgetSchema>;
export type TitleWidget = z.infer<typeof TitleWidgetSchema>;
export type ParagraphWidget = z.infer<typeof ParagraphWidgetSchema>;
export type ImageWidget = z.infer<typeof ImageWidgetSchema>;
export type LineChartWidget = z.infer<typeof LineChartWidgetSchema>;
export type BarChartWidget = z.infer<typeof BarChartWidgetSchema>;
export type MetricWidget = z.infer<typeof MetricWidgetSchema>;
export type MapWidget = z.infer<typeof MapWidgetSchema>;

export type Widget = z.infer<typeof WidgetSchema>;

// ============================================================================
// Type Maps and Registry
// ============================================================================

/**
 * Registry of widget data schemas for validation
 */
export const WidgetDataSchemas = {
  [WIDGET_TYPES.TABLE]: TableWidgetDataSchema,
  [WIDGET_TYPES.TITLE]: TitleWidgetDataSchema,
  [WIDGET_TYPES.PARAGRAPH]: ParagraphWidgetDataSchema,
  [WIDGET_TYPES.IMAGE]: ImageWidgetDataSchema,
  [WIDGET_TYPES.LINE_CHART]: LineChartWidgetDataSchema,
  [WIDGET_TYPES.BAR_CHART]: BarChartWidgetDataSchema,
  [WIDGET_TYPES.METRIC]: MetricWidgetDataSchema,
  [WIDGET_TYPES.MAP]: MapWidgetDataSchema,
} as const;

/**
 * Registry of complete widget schemas
 */
export const WidgetSchemas = {
  [WIDGET_TYPES.TABLE]: TableWidgetSchema,
  [WIDGET_TYPES.TITLE]: TitleWidgetSchema,
  [WIDGET_TYPES.PARAGRAPH]: ParagraphWidgetSchema,
  [WIDGET_TYPES.IMAGE]: ImageWidgetSchema,
  [WIDGET_TYPES.LINE_CHART]: LineChartWidgetSchema,
  [WIDGET_TYPES.BAR_CHART]: BarChartWidgetSchema,
  [WIDGET_TYPES.METRIC]: MetricWidgetSchema,
  [WIDGET_TYPES.MAP]: MapWidgetSchema,
} as const;

/**
 * Type-safe widget data mapping
 */
export interface WidgetDataTypeMap {
  [WIDGET_TYPES.TABLE]: TableWidgetData;
  [WIDGET_TYPES.TITLE]: TitleWidgetData;
  [WIDGET_TYPES.PARAGRAPH]: ParagraphWidgetData;
  [WIDGET_TYPES.IMAGE]: ImageWidgetData;
  [WIDGET_TYPES.LINE_CHART]: LineChartWidgetData;
  [WIDGET_TYPES.BAR_CHART]: BarChartWidgetData;
  [WIDGET_TYPES.METRIC]: MetricWidgetData;
  [WIDGET_TYPES.MAP]: MapWidgetData;
}

/**
 * Type-safe widget mapping
 */
export interface WidgetTypeMap {
  [WIDGET_TYPES.TABLE]: TableWidget;
  [WIDGET_TYPES.TITLE]: TitleWidget;
  [WIDGET_TYPES.PARAGRAPH]: ParagraphWidget;
  [WIDGET_TYPES.IMAGE]: ImageWidget;
  [WIDGET_TYPES.LINE_CHART]: LineChartWidget;
  [WIDGET_TYPES.BAR_CHART]: BarChartWidget;
  [WIDGET_TYPES.METRIC]: MetricWidget;
  [WIDGET_TYPES.MAP]: MapWidget;
}

// ============================================================================
// Dashboard Configuration
// ============================================================================

export const DashboardConfigSchema = z.object({
  gridColumns: z.number().int().min(1).max(24).default(12).describe('Number of grid columns'),
  gridRows: z.number().int().min(1).max(24).default(12).describe('Number of grid rows'),
  gap: z.number().min(0).default(8).describe('Gap between widgets in pixels'),
  minCellHeight: z.number().min(0).default(40).describe('Minimum cell height in pixels'),
  maxWidgets: z.number().int().min(1).optional().describe('Maximum number of widgets'),
  theme: z.object({
    mode: z.enum(['light', 'dark']).default('light').describe('Theme mode'),
    primaryColor: z.string().optional().describe('Primary color'),
    backgroundColor: z.string().optional().describe('Background color'),
    gridColor: z.string().optional().describe('Grid line color'),
  }).optional().describe('Theme configuration'),
  responsive: z.object({
    breakpoints: z.object({
      mobile: z.number().optional().default(640).describe('Mobile breakpoint'),
      tablet: z.number().optional().default(1024).describe('Tablet breakpoint'),
      desktop: z.number().optional().default(1280).describe('Desktop breakpoint'),
    }).optional(),
    mobileColumns: z.number().int().min(1).optional().default(4).describe('Columns on mobile'),
    tabletColumns: z.number().int().min(1).optional().default(8).describe('Columns on tablet'),
  }).optional().describe('Responsive configuration'),
});

export type DashboardConfig = z.infer<typeof DashboardConfigSchema>;

// ============================================================================
// Interaction States
// ============================================================================

export const DragStateSchema = z.object({
  isDragging: z.boolean().describe('Whether dragging is active'),
  activeWidgetId: z.string().nullable().describe('ID of widget being dragged'),
  ghostPosition: PositionSchema.nullable().describe('Ghost position while dragging'),
  dragOffset: PositionSchema.optional().describe('Offset from drag start point'),
  validDropZone: z.boolean().optional().describe('Whether current position is valid'),
});

export const ResizeStateSchema = z.object({
  isResizing: z.boolean().describe('Whether resizing is active'),
  activeWidgetId: z.string().nullable().describe('ID of widget being resized'),
  resizeHandle: z.enum([
    'top', 'right', 'bottom', 'left',
    'top-left', 'top-right', 'bottom-left', 'bottom-right',
  ]).nullable().describe('Active resize handle'),
  originalSize: SizeSchema.optional().describe('Size before resize'),
  previewSize: SizeSchema.optional().describe('Preview size while resizing'),
});

export type DragState = z.infer<typeof DragStateSchema>;
export type ResizeState = z.infer<typeof ResizeStateSchema>;

// ============================================================================
// Event Types
// ============================================================================

export const WidgetEventSchema = z.object({
  widgetId: z.string().describe('Widget ID'),
  type: z.enum([
    'click', 'hover', 'focus', 'blur',
    'resize', 'move', 'remove', 'update', 'refresh',
  ]).describe('Event type'),
  timestamp: z.number().describe('Event timestamp'),
  payload: z.unknown().optional().describe('Event payload'),
});

export type WidgetEvent<T = unknown> = Omit<z.infer<typeof WidgetEventSchema>, 'payload'> & {
  payload?: T;
};

export type WidgetEventType = WidgetEvent['type'];

// ============================================================================
// Type Guards
// ============================================================================

export const isTableWidget = (widget: Widget): widget is TableWidget =>
  widget.type === WIDGET_TYPES.TABLE;

export const isTitleWidget = (widget: Widget): widget is TitleWidget =>
  widget.type === WIDGET_TYPES.TITLE;

export const isParagraphWidget = (widget: Widget): widget is ParagraphWidget =>
  widget.type === WIDGET_TYPES.PARAGRAPH;

export const isImageWidget = (widget: Widget): widget is ImageWidget =>
  widget.type === WIDGET_TYPES.IMAGE;

export const isLineChartWidget = (widget: Widget): widget is LineChartWidget =>
  widget.type === WIDGET_TYPES.LINE_CHART;

export const isBarChartWidget = (widget: Widget): widget is BarChartWidget =>
  widget.type === WIDGET_TYPES.BAR_CHART;

export const isMetricWidget = (widget: Widget): widget is MetricWidget =>
  widget.type === WIDGET_TYPES.METRIC;

export const isMapWidget = (widget: Widget): widget is MapWidget =>
  widget.type === WIDGET_TYPES.MAP;

export const isWidgetType = (type: unknown): type is WidgetType => {
  return typeof type === 'string' && type in WidgetDataSchemas;
};

export const hasWidgetSchema = (type: WidgetType): type is keyof typeof WidgetDataSchemas => {
  return type in WidgetDataSchemas;
};

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate widget data against its schema
 */
export function validateWidgetData<T extends WidgetType>(
  widgetType: T,
  data: unknown
): z.SafeParseReturnType<unknown, WidgetDataTypeMap[T]> {
  const schema = WidgetDataSchemas[widgetType];
  return schema.safeParse(data) as z.SafeParseReturnType<unknown, WidgetDataTypeMap[T]>;
}

/**
 * Parse widget data with validation (throws on error)
 */
export function parseWidgetData<T extends WidgetType>(
  widgetType: T,
  data: unknown
): WidgetDataTypeMap[T] {
  const schema = WidgetDataSchemas[widgetType];
  return schema.parse(data) as WidgetDataTypeMap[T];
}

/**
 * Validate a complete widget
 */
export function validateWidget(widget: unknown): z.SafeParseReturnType<unknown, Widget> {
  return WidgetSchema.safeParse(widget);
}

/**
 * Parse a complete widget (throws on error)
 */
export function parseWidget(widget: unknown): Widget {
  return WidgetSchema.parse(widget);
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a validated widget
 */
export function createWidget<T extends WidgetType>(
  type: T,
  id: string,
  position: Position,
  size: Size,
  data: WidgetDataTypeMap[T],
  options?: {
    constraints?: WidgetConstraints;
    metadata?: WidgetMetadata;
    title?: string;
    description?: string;
    locked?: boolean;
  }
): WidgetTypeMap[T] {
  const widget = {
    id,
    type,
    position,
    size,
    data,
    ...options,
  };
  
  const schema = WidgetSchemas[type];
  return schema.parse(widget) as WidgetTypeMap[T];
}

/**
 * Create widget with defaults
 */
export function createWidgetWithDefaults<T extends WidgetType>(
  type: T,
  id: string,
  data: Partial<WidgetDataTypeMap[T]> = {}
): WidgetTypeMap[T] {
  const defaultPosition: Position = { gridColumn: 0, gridRow: 0 };
  const defaultSize: Size = { colSpan: 2, rowSpan: 2 };
  
  // Get default data for widget type
  const defaultData = getDefaultWidgetData(type);
  const mergedData = { ...defaultData, ...data } as WidgetDataTypeMap[T];
  
  return createWidget(type, id, defaultPosition, defaultSize, mergedData);
}

/**
 * Get default data for a widget type
 */
export function getDefaultWidgetData<T extends WidgetType>(type: T): WidgetDataTypeMap[T] {
  const defaults: { [K in WidgetType]: WidgetDataTypeMap[K] } = {
    [WIDGET_TYPES.TABLE]: {
      headers: ['Column 1', 'Column 2'],
      rows: [{ 'Column 1': 'Value 1', 'Column 2': 'Value 2' }],
      sortable: false,
      paginated: false,
      pageSize: 10,
    } as TableWidgetData,
    [WIDGET_TYPES.TITLE]: {
      title: 'Widget Title',
    } as TitleWidgetData,
    [WIDGET_TYPES.PARAGRAPH]: {
      content: 'Widget content goes here...',
      markdown: false,
    } as ParagraphWidgetData,
    [WIDGET_TYPES.IMAGE]: {
      src: 'https://via.placeholder.com/400x300',
      alt: 'Placeholder image',
    } as ImageWidgetData,
    [WIDGET_TYPES.LINE_CHART]: {
      datasets: [{
        label: 'Dataset 1',
        data: [10, 20, 30, 40, 50],
      }],
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
    } as LineChartWidgetData,
    [WIDGET_TYPES.BAR_CHART]: {
      datasets: [{
        label: 'Dataset 1',
        data: [10, 20, 30, 40, 50],
      }],
      labels: ['A', 'B', 'C', 'D', 'E'],
    } as BarChartWidgetData,
    [WIDGET_TYPES.METRIC]: {
      label: 'Metric',
      value: 0,
    } as MetricWidgetData,
    [WIDGET_TYPES.MAP]: {
      center: { lat: 0, lon: 0 },
      zoom: 10,
      mapType: 'leaflet',
    } as MapWidgetData,
  };
  
  return defaults[type] as WidgetDataTypeMap[T];
}

// ============================================================================
// OpenAI Integration
// ============================================================================

export interface OpenAITextFormatConfig {
  type: 'json_schema';
  name: string;
  strict: true;
  schema: Record<string, unknown>;
}

/**
 * Get OpenAI text format for widget data
 */
export function getWidgetTextFormat<T extends WidgetType>(
  widgetType: T,
  name?: string
): OpenAITextFormatConfig {
  const schema = WidgetDataSchemas[widgetType];
  const configName = name || `${widgetType}WidgetData`;
  return zodTextFormat(schema, configName) as OpenAITextFormatConfig;
}

/**
 * Get OpenAI text format for complete widget
 */
export function getCompleteWidgetTextFormat<T extends WidgetType>(
  widgetType: T,
  name?: string
): OpenAITextFormatConfig {
  const schema = WidgetSchemas[widgetType];
  const configName = name || `${widgetType}Widget`;
  return zodTextFormat(schema, configName) as OpenAITextFormatConfig;
}

// ============================================================================
// Bridge System Types
// ============================================================================

/**
 * Channel configuration for widget data flow
 */
export interface WidgetChannelConfig<T extends WidgetType = WidgetType> {
  readonly channelId: string;
  readonly widgetType: T;
  readonly schema: z.ZodSchema<WidgetDataTypeMap[T]>;
  readonly description?: string;
}

/**
 * Publisher interface for validated widget data
 */
export interface WidgetPublisher<T> {
  publish(data: T): void;
  safeParse(data: unknown): z.SafeParseReturnType<unknown, T>;
  clear(): void;
}

/**
 * Consumer interface for validated widget data
 */
export interface WidgetConsumer<T> {
  subscribe(callback: (data: T | undefined) => void): () => void;
  get(): T | undefined;
}

/**
 * Bridge configuration for job to widget data flow
 */
export interface JobWidgetBridgeConfig<T extends WidgetType = WidgetType> {
  readonly jobId: string;
  readonly channel: WidgetChannelConfig<T>;
  readonly transformer?: (jobResult: string) => unknown;
  readonly filter?: (update: JobUpdate) => boolean;
}

/**
 * Job update structure
 */
export interface JobUpdate {
  id: string;
  status: string;
  result: string | null;
  error?: string | null;
  progress?: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Result of creating a job-widget bridge
 */
export interface JobWidgetBridge {
  disconnect: () => void;
  getStatus: () => BridgeStatus;
}

export interface BridgeStatus {
  connected: boolean;
  lastUpdate?: Date;
  lastError?: z.ZodError | Error;
}

// ============================================================================
// Store Integration Types
// ============================================================================

/**
 * Map store producer/consumer interfaces
 */
export interface StoreProducer<T> {
  publish: (value: T) => void;
  clear: () => void;
}

export interface StoreConsumer<T> {
  subscribe: Readable<T | undefined>['subscribe'];
  get: () => T | undefined;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Extract widget data type from widget type
 */
export type WidgetDataType<T extends Widget> = T['data'];

/**
 * Create a partial widget for updates
 */
export type PartialWidget<T extends Widget> = Partial<Omit<T, 'id' | 'type'>> & 
  Pick<T, 'id' | 'type'>;

/**
 * Widget factory function type
 */
export type WidgetFactory<T extends WidgetType> = (
  id: string,
  position: Position,
  size: Size,
  data: WidgetDataTypeMap[T],
  options?: Partial<BaseWidget>
) => WidgetTypeMap[T];

// ============================================================================
// Export Default
// ============================================================================

export default {
  // Constants
  WIDGET_TYPES,
  WIDGET_ACTIONS,
  
  // Schemas
  WidgetSchema,
  WidgetSchemas,
  WidgetDataSchemas,
  DashboardConfigSchema,
  
  // Type guards
  isTableWidget,
  isTitleWidget,
  isParagraphWidget,
  isImageWidget,
  isLineChartWidget,
  isBarChartWidget,
  isMetricWidget,
  isMapWidget,
  isWidgetType,
  hasWidgetSchema,
  
  // Validation
  validateWidget,
  parseWidget,
  validateWidgetData,
  parseWidgetData,
  
  // Factories
  createWidget,
  createWidgetWithDefaults,
  getDefaultWidgetData,
  
  // OpenAI integration
  getWidgetTextFormat,
  getCompleteWidgetTextFormat,
};