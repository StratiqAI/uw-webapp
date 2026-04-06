export declare const schemaWidget: import("@stratiqai/dashboard-widget-sdk").WidgetManifest<{
    schemaId: string;
    data?: unknown;
}>;
export { schemaWidgetDataSchema, schemaAiOutputSchema } from './schema.js';
export type { SchemaWidgetData, SchemaAiOutput } from './schema.js';
export { default as SchemaWidget } from './SchemaWidget.svelte';
