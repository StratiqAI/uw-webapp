export declare const metricWidget: import("@stratiqai/dashboard-widget-sdk").WidgetManifest<{
    label: string;
    value: string | number;
    title?: string | null | undefined;
    description?: string | null | undefined;
    change?: number | null | undefined;
    changeType?: "increase" | "decrease" | null | undefined;
    unit?: string | null | undefined;
}>;
export { metricWidgetDataSchema, type MetricWidgetData } from './schema.js';
export { default as MetricWidget } from './MetricWidget.svelte';
