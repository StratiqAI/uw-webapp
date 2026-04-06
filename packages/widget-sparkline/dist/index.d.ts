export declare const sparklineWidget: import("@stratiqai/dashboard-widget-sdk").WidgetManifest<{
    values: number[];
    label?: string | null | undefined;
    color?: string | null | undefined;
}>;
export { sparklineWidgetDataSchema } from './schema.js';
export type { SparklineWidgetData } from './schema.js';
export { default as SparklineWidget } from './SparklineWidget.svelte';
