/**
 * Widget Schema Registration
 * 
 * Registers all widget Zod schemas with both:
 * - SchemaRegistry (for JSON Schema conversion and component mapping)
 * - ValidatedTopicStore (for runtime validation of widget data)
 * 
 * Call this function at app startup, before any widgets are initialized.
 */

import { schemaRegistry } from '$lib/stores/SchemaRegistry';
import { validatedTopicStore } from '$lib/stores/validatedTopicStore';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { WidgetDataSchemas } from '$lib/dashboard/types/widgetSchemas';
import type { WidgetType } from '$lib/dashboard/types/widget';
import { getRegisteredManifests } from '$lib/dashboard/setup/widgetRegistry';

/**
 * Map widget types to human-readable names
 */
const WIDGET_NAMES: Record<WidgetType, string> = {
	paragraph: 'Paragraph Widget',
	table: 'Table Widget',
	title: 'Title Widget',
	image: 'Image Widget',
	lineChart: 'Line Chart Widget',
	barChart: 'Bar Chart Widget',
	donutChart: 'Donut Chart Widget',
	areaChart: 'Area Chart Widget',
	gauge: 'Gauge Widget',
	sparkline: 'Sparkline Widget',
	heatmap: 'Heatmap Widget',
	divergingBarChart: 'Diverging Bar Chart Widget',
	metric: 'Metric Widget',
	map: 'Map Widget',
	schema: 'Schema Widget',
	locationQuotient: 'Location Quotient Widget'
};

/**
 * All widget types that should be registered
 */
export const WIDGET_TYPES: WidgetType[] = [
	'paragraph',
	'table',
	'title',
	'image',
	'lineChart',
	'barChart',
	'donutChart',
	'areaChart',
	'gauge',
	'sparkline',
	'heatmap',
	'divergingBarChart',
	'map',
	'schema',
	'locationQuotient'
];

// Track if schemas have been registered
let schemasRegistered = false;

/**
 * Register all widget schemas with SchemaRegistry
 * 
 * This function registers all widget types using their Zod schemas.
 * The SchemaRegistry will automatically:
 * - Convert Zod schemas to JSON Schema (for storage/AI compatibility)
 * - Compile to Zod validators (for runtime validation)
 * - Store both formats for efficient access
 */
export function registerWidgetSchemas(): void {
	if (schemasRegistered) {
		console.log('🔧 [Widget Schema Registration] Schemas already registered, skipping...');
		return;
	}

	console.log('🔧 [Widget Schema Registration] Starting widget schema registration...');

	for (const widgetType of WIDGET_TYPES) {
		const schemaId = `widget:${widgetType}-v1`;
		const schema = WidgetDataSchemas[widgetType];
		const name = WIDGET_NAMES[widgetType];

		try {
			// Register with SchemaRegistry (for component mapping)
			schemaRegistry.registerZodSchema(schemaId, schema, {
				name,
				description: `Data schema for ${name.toLowerCase()}`
			});

			console.log(`   ✅ SchemaRegistry: ${schemaId} (${name})`);
		} catch (error) {
			console.error(`   ❌ Failed to register ${schemaId} with SchemaRegistry:`, error);
			throw error;
		}
	}

	// Register package-based widget manifests
	for (const manifest of getRegisteredManifests()) {
		const schemaId = `widget:${manifest.kind}-${manifest.schemaVersion}`;
		try {
			schemaRegistry.registerZodSchema(schemaId, manifest.zodSchema, {
				name: manifest.displayName,
				description: `Data schema for ${manifest.displayName.toLowerCase()}`
			});
			console.log(`   ✅ SchemaRegistry (package): ${schemaId} (${manifest.displayName})`);
		} catch (error) {
			console.error(`   ❌ Failed to register package widget ${schemaId}:`, error);
		}
	}

	console.log('✅ [Widget Schema Registration] All widget schemas registered with SchemaRegistry');
	schemasRegistered = true;
}

/**
 * Register all widget schemas with ValidatedTopicStore
 * 
 * This function registers JSON Schemas with ValidatedTopicStore using
 * wildcard patterns so that all widget data is validated at the boundary.
 * 
 * Topic patterns:
 * - widgets/{widgetType}/+ - Matches all widgets of a specific type
 * 
 * Example: widgets/metric/+ validates all metric widget data
 */
export function registerWidgetSchemasWithTopicStore(): void {
	console.log('🔧 [Widget Schema Registration] Registering schemas with ValidatedTopicStore...');

	for (const widgetType of WIDGET_TYPES) {
		const zodSchema = WidgetDataSchemas[widgetType];
		const topicPattern = `widgets/${widgetType}/+`;

		try {
			// Convert Zod schema to JSON Schema
			const jsonSchema = zodToJsonSchema(zodSchema, {
				name: `${widgetType}WidgetData`,
				$refStrategy: 'none' // Inline all references
			});

			// Register with ValidatedTopicStore using wildcard pattern
			validatedTopicStore.registerSchema(topicPattern, jsonSchema);

			console.log(`   ✅ ValidatedTopicStore: ${topicPattern}`);
		} catch (error) {
			console.error(`   ❌ Failed to register ${topicPattern} with ValidatedTopicStore:`, error);
			throw error;
		}
	}

	// Register package-based widget manifests
	for (const manifest of getRegisteredManifests()) {
		const topicPattern = `widgets/${manifest.kind}/+`;
		try {
			const jsonSchema = zodToJsonSchema(manifest.zodSchema, {
				name: `${manifest.kind}WidgetData`,
				$refStrategy: 'none'
			});
			validatedTopicStore.registerSchema(topicPattern, jsonSchema);
			console.log(`   ✅ ValidatedTopicStore (package): ${topicPattern}`);
		} catch (error) {
			console.error(`   ❌ Failed to register package topic ${topicPattern}:`, error);
		}
	}

	console.log('✅ [Widget Schema Registration] All widget schemas registered with ValidatedTopicStore');
}

/**
 * Initialize all widget schemas
 * 
 * Call this once at app startup to register schemas with both:
 * - SchemaRegistry (for component mapping and JSON Schema access)
 * - ValidatedTopicStore (for runtime validation)
 */
export function initializeWidgetSchemas(): void {
	registerWidgetSchemas();
	registerWidgetSchemasWithTopicStore();
}

/**
 * Get schema ID for a widget type
 * 
 * @param widgetType - The widget type
 * @returns The schema ID (e.g., 'widget:title-v1')
 */
export function getWidgetSchemaId(widgetType: WidgetType): string {
	return `widget:${widgetType}-v1`;
}

/**
 * Get topic path for a widget instance in ValidatedTopicStore
 * 
 * @param widgetType - The widget type
 * @param widgetId - The widget instance ID
 * @param topicOverride - Optional topic override (if provided, returns this instead)
 * @returns The topic path (e.g., 'widgets/metric/widget-1')
 */
export function getWidgetTopic(widgetType: WidgetType | string, widgetId: string, topicOverride?: string): string {
	if (topicOverride) {
		return topicOverride;
	}
	return `widgets/${widgetType}/${widgetId}`;
}

/**
 * Get all topics for a widget type from ValidatedTopicStore
 * 
 * @param widgetType - The widget type
 * @returns Array of topic paths that have data for this widget type
 */
export function getWidgetTopicsByType(widgetType: WidgetType): Array<{ id: string; data: unknown }> {
	const basePath = `widgets/${widgetType}`;
	return validatedTopicStore.getAllAt(basePath);
}
