/**
 * Widget Schema Registration
 * 
 * Registers all widget Zod schemas with the SchemaRegistry.
 * This enables schema validation for all widget data flowing through MapStore.
 * 
 * Call this function at app startup, before any widgets are initialized.
 */

import { schemaRegistry } from '$lib/stores/SchemaRegistry';
import {
	WidgetDataSchemas,
	type WidgetType
} from '$lib/dashboard/types/widgetSchemas';

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
	metric: 'Metric Widget',
	map: 'Map Widget'
};

/**
 * Register all widget schemas with SchemaRegistry
 * 
 * This function registers all 8 widget types using their Zod schemas.
 * The SchemaRegistry will automatically:
 * - Convert Zod schemas to JSON Schema (for storage/AI compatibility)
 * - Compile to Zod validators (for runtime validation)
 * - Store both formats for efficient access
 */
export function registerWidgetSchemas(): void {
	console.log('🔧 [Widget Schema Registration] Starting widget schema registration...');

	const widgetTypes: WidgetType[] = [
		'paragraph',
		'table',
		'title',
		'image',
		'lineChart',
		'barChart',
		'metric',
		'map'
	];

	for (const widgetType of widgetTypes) {
		const schemaId = `widget:${widgetType}-v1`;
		const schema = WidgetDataSchemas[widgetType];
		const name = WIDGET_NAMES[widgetType];

		try {
			schemaRegistry.registerZodSchema(schemaId, schema, {
				name,
				description: `Data schema for ${name.toLowerCase()}`
			});

			console.log(`   ✅ Registered: ${schemaId} (${name})`);
		} catch (error) {
			console.error(`   ❌ Failed to register ${schemaId}:`, error);
			throw error;
		}
	}

	console.log('✅ [Widget Schema Registration] All widget schemas registered successfully');
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
 * Get topic name for a widget instance
 * 
 * @param widgetType - The widget type
 * @param widgetId - The widget instance ID
 * @returns The topic name (e.g., 'widget:title:abc123')
 */
export function getWidgetTopic(widgetType: WidgetType, widgetId: string): string {
	return `widget:${widgetType}:${widgetId}`;
}

