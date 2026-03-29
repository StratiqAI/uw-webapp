import type { Component } from 'svelte';
import type { z } from 'zod';

/**
 * Standard props every widget component receives from the host dashboard.
 * Widget authors should declare their component's Props to extend or match this shape.
 */
export interface StandardWidgetProps<TData = unknown> {
	data: TData;
	widgetId?: string;
	topicOverride?: string;
	darkMode?: boolean;
	/** Host-driven refresh counter; incrementing triggers refetch in useExternalData. */
	refreshSignal?: number;
	/** Persist config changes back to the dashboard store (widget.data). */
	onUpdateConfig?: (data: TData) => void;
	/** Register a toggle function the host calls when the user clicks Configure/Edit. */
	onConfigureReady?: (toggleFn: () => void) => void;
}

/**
 * Manifest returned by `defineWidget()`. The host dashboard uses this to
 * register schemas, resolve the component, and seed default data/sizing.
 */
export interface WidgetManifest<TData = unknown> {
	kind: string;
	displayName: string;
	schemaVersion: string;
	zodSchema: z.ZodSchema<TData>;
	/**
	 * If present, the topic store uses this for validation instead of zodSchema.
	 * Allows the topic store to hold a narrow input shape (e.g. city/state/zip)
	 * while widget.data holds the full config validated by zodSchema.
	 */
	inputSchema?: z.ZodSchema;
	component: Component<StandardWidgetProps<TData>>;
	defaultData: TData;
	defaultSize: { colSpan: number; rowSpan: number };
	/** Services this widget requires from the host (informational). */
	capabilities?: string[];
}

/** Provides typed access to host-injected service instances. */
export interface ServiceAccessor {
	get<S = unknown>(name: string): S | undefined;
	has(name: string): boolean;
}

/**
 * Contract that the host app must satisfy and inject via `setDashboardWidgetHost()`.
 * Widget packages read this through `getDashboardWidgetHost()` at runtime.
 */
export interface DashboardWidgetHost {
	validatedTopicStore: {
		readonly tree: unknown;
		at<T>(topic: string): T | undefined;
		publish(topic: string, data: unknown): boolean;
		registerSchema(topicPattern: string, jsonSchema: unknown): void;
		/** Read-merge-publish: update specific fields without clobbering the rest. */
		patch(topic: string, partial: Record<string, unknown>): boolean;
	};
	getWidgetTopic(kind: string, widgetId: string, topicOverride?: string): string;
	/** Service registry -- host provides named service instances. */
	services?: ServiceAccessor;
}
