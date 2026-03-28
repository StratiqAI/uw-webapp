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
    component: Component<StandardWidgetProps<TData>>;
    defaultData: TData;
    defaultSize: {
        colSpan: number;
        rowSpan: number;
    };
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
    };
    getWidgetTopic(kind: string, widgetId: string, topicOverride?: string): string;
}
