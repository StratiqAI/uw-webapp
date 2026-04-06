export declare const divergingBarChartWidget: import("@stratiqai/dashboard-widget-sdk").WidgetManifest<{
    labels: string[];
    values: number[];
    positiveColor?: string | null | undefined;
    negativeColor?: string | null | undefined;
}>;
export { divergingBarChartWidgetDataSchema, divergingBarChartAiOutputSchema } from './schema.js';
export type { DivergingBarChartWidgetData, DivergingBarChartAiOutput } from './schema.js';
export { default as DivergingBarChartWidget } from './DivergingBarChartWidget.svelte';
