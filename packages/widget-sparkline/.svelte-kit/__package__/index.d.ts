export declare const sparklineWidget: import("@stratiqai/dashboard-widget-sdk").WidgetManifest<{
    values: number[];
    label?: string | null | undefined;
    color?: string | null | undefined;
}>;
export { sparklineWidgetDataSchema, sparklineAiOutputSchema } from './schema.js';
export type { SparklineWidgetData, SparklineAiOutput } from './schema.js';
export { default as SparklineWidget } from './SparklineWidget.svelte';
