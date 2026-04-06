import { defineWidget } from '@stratiqai/dashboard-widget-sdk';
import { schemaWidgetDataSchema } from './schema.js';
import SchemaWidget from './SchemaWidget.svelte';

export const schemaWidget = defineWidget({
	kind: 'schema',
	displayName: 'Schema Widget',
	zodSchema: schemaWidgetDataSchema,
	component: SchemaWidget,
	defaultData: {
		schemaId: 'example-schema',
		data: {}
	},
	defaultSize: { colSpan: 6, rowSpan: 3 },
	palette: { icon: '📋', category: 'data' }
});

export { schemaWidgetDataSchema } from './schema.js';
export type { SchemaWidgetData } from './schema.js';
export { default as SchemaWidget } from './SchemaWidget.svelte';
