export declare const heatmapWidget: import("@stratiqai/dashboard-widget-sdk").WidgetManifest<{
    rows: string[];
    cols: string[];
    values: number[][];
}>;
export { heatmapWidgetDataSchema, heatmapAiOutputSchema } from './schema.js';
export type { HeatmapWidgetData, HeatmapAiOutput } from './schema.js';
export { default as HeatmapWidget } from './HeatmapWidget.svelte';
