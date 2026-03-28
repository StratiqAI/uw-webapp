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
	component: Component<StandardWidgetProps<TData>>;
	defaultData: TData;
	defaultSize?: { colSpan: number; rowSpan: number };
}): WidgetManifest<TData> {
	return {
		schemaVersion: 'v1',
		defaultSize: { colSpan: 4, rowSpan: 2 },
		...config
	};
}
