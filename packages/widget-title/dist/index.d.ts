export declare const titleWidget: import("@stratiqai/dashboard-widget-sdk").WidgetManifest<{
    title: string;
    subtitle?: string | null | undefined;
    alignment?: "left" | "center" | "right" | null | undefined;
}>;
export { titleWidgetDataSchema, type TitleWidgetData } from './schema.js';
export { default as TitleWidget } from './TitleWidget.svelte';
