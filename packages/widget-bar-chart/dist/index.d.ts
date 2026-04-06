export declare const barChartWidget: import("@stratiqai/dashboard-widget-sdk").WidgetManifest<{
    datasets: {
        label: string;
        data: number[];
        backgroundColor?: string | null | undefined;
    }[];
    labels: string[];
    orientation?: "vertical" | "horizontal" | null | undefined;
}>;
export { barChartWidgetDataSchema, barChartAiOutputSchema } from './schema.js';
export type { BarChartWidgetData, BarChartAiOutput } from './schema.js';
export { default as BarChartWidget } from './BarChartWidget.svelte';
