export declare const paragraphWidget: import("@stratiqai/dashboard-widget-sdk").WidgetManifest<{
    content: string;
    markdown: boolean | null;
    title?: string | null | undefined;
}>;
export { paragraphWidgetDataSchema, paragraphAiOutputSchema } from './schema.js';
export type { ParagraphWidgetData, ParagraphAiOutput } from './schema.js';
export { default as ParagraphWidget } from './ParagraphWidget.svelte';
