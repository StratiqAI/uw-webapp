import type { z } from 'zod';
import type { WidgetManifest, StandardWidgetProps } from './types.js';
import type { Component } from 'svelte';
/**
 * Factory for creating a type-safe widget manifest.
 *
 * Widget package authors call this once in their entry module and export
 * the result. The host dashboard imports it to register the widget.
 */
export declare function defineWidget<TData>(config: {
    kind: string;
    displayName: string;
    schemaVersion?: string;
    zodSchema: z.ZodSchema<TData>;
    /** Narrow schema for topic store validation (defaults to zodSchema). */
    inputSchema?: z.ZodSchema;
    component: Component<StandardWidgetProps<TData>>;
    defaultData: TData;
    defaultSize?: {
        colSpan: number;
        rowSpan: number;
    };
    /** Services this widget requires from the host (informational). */
    capabilities?: string[];
}): WidgetManifest<TData>;
