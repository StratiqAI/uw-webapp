export declare const lineChartWidget: import("@stratiqai/dashboard-widget-sdk").WidgetManifest<{
    datasets: {
        label: string;
        data: number[];
        color?: string | null | undefined;
    }[];
    labels: string[];
    options?: {
        responsive?: boolean | null | undefined;
        maintainAspectRatio?: boolean | null | undefined;
    } | null | undefined;
}>;
export { lineChartWidgetDataSchema, lineChartAiOutputSchema } from './schema.js';
export type { LineChartWidgetData, LineChartAiOutput } from './schema.js';
export { default as LineChartWidget } from './LineChartWidget.svelte';
