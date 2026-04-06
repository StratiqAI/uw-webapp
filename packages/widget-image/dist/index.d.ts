export declare const imageWidget: import("@stratiqai/dashboard-widget-sdk").WidgetManifest<{
    src: string;
    alt: string;
    title?: string | null | undefined;
    objectFit?: "cover" | "contain" | "fill" | null | undefined;
}>;
export { imageWidgetDataSchema, imageAiOutputSchema } from './schema.js';
export type { ImageWidgetData, ImageAiOutput } from './schema.js';
export { default as ImageWidget } from './ImageWidget.svelte';
