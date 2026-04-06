export declare const jsonViewerWidget: import("@stratiqai/dashboard-widget-sdk").WidgetManifest<{
    title?: string | null | undefined;
    description?: string | null | undefined;
    json?: unknown;
}>;
export { jsonViewerWidgetDataSchema, jsonViewerAiOutputSchema } from './schema.js';
export type { JsonViewerWidgetData, JsonViewerAiOutput } from './schema.js';
export { default as JsonViewerWidget } from './JsonViewerWidget.svelte';
