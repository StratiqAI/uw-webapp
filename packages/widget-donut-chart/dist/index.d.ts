export declare const donutChartWidget: import("@stratiqai/dashboard-widget-sdk").WidgetManifest<{
    labels: string[];
    values: number[];
    colors?: string[] | null | undefined;
    centerLabel?: string | null | undefined;
}>;
export { donutChartWidgetDataSchema, donutChartAiOutputSchema } from './schema.js';
export type { DonutChartWidgetData, DonutChartAiOutput } from './schema.js';
export { default as DonutChartWidget } from './DonutChartWidget.svelte';
