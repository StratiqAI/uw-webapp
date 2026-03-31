import type { z } from 'zod';
import type { WidgetManifest, StandardWidgetProps } from './types.js';
import type { Component } from 'svelte';

/**
 * Factory for creating a type-safe widget manifest.
 *
 * Widget package authors call this once in their entry module and export
 * the result. The host dashboard imports it to register the widget.
 */
export function defineWidget<TData>(config: {
	kind: string;
	displayName: string;
	schemaVersion?: string;
	zodSchema: z.ZodSchema<TData>;
	/** Narrow schema for topic store validation (defaults to zodSchema). */
	inputSchema?: z.ZodSchema;
	/** Schema for payloads this widget publishes. Omit for subscribe-only widgets. */
	outputSchema?: z.ZodSchema;
	component: Component<StandardWidgetProps<TData>>;
	defaultData: TData;
	defaultSize?: { colSpan: number; rowSpan: number };
	/** Services this widget requires from the host (informational). */
	capabilities?: string[];
	/** Palette metadata for the host "Add Widget" UI. */
	palette?: { icon: string; category?: string };
}): WidgetManifest<TData> {
	return {
		schemaVersion: 'v1',
		defaultSize: { colSpan: 4, rowSpan: 2 },
		...config
	};
}
