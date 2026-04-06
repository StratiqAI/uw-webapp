export declare const gaugeWidget: import("@stratiqai/dashboard-widget-sdk").WidgetManifest<{
    value: number;
    min?: number | null | undefined;
    max?: number | null | undefined;
    label?: string | null | undefined;
    unit?: string | null | undefined;
    color?: string | null | undefined;
}>;
export { gaugeWidgetDataSchema } from './schema.js';
export type { GaugeWidgetData } from './schema.js';
export { default as GaugeWidget } from './GaugeWidget.svelte';
