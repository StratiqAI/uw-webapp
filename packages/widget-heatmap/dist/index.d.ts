export declare const heatmapWidget: import("@stratiqai/dashboard-widget-sdk").WidgetManifest<{
    rows: string[];
    cols: string[];
    values: number[][];
}>;
export { heatmapWidgetDataSchema } from './schema.js';
export type { HeatmapWidgetData } from './schema.js';
export { default as HeatmapWidget } from './HeatmapWidget.svelte';
