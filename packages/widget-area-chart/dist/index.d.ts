export declare const areaChartWidget: import("@stratiqai/dashboard-widget-sdk").WidgetManifest<{
    labels: string[];
    datasets: {
        label: string;
        data: number[];
        color?: string | null | undefined;
    }[];
}>;
export { areaChartWidgetDataSchema, areaChartAiOutputSchema } from './schema.js';
export type { AreaChartWidgetData, AreaChartAiOutput } from './schema.js';
export { default as AreaChartWidget } from './AreaChartWidget.svelte';
