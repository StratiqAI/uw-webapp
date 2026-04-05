import type { Component } from 'svelte';
import type { z } from 'zod';
/**
 * Standard props every widget component receives from the host dashboard.
 * Widget authors should declare their component's Props to extend or match this shape.
 */
/** Host app theme (light / dark / warm “coffee”). Optional; widgets may fall back to darkMode. */
export type DashboardAppTheme = 'light' | 'dark' | 'warm';
export interface StandardWidgetProps<TData = unknown> {
    data: TData;
    widgetId?: string;
    topicOverride?: string;
    darkMode?: boolean;
    /** When set, widgets can style for warm (coffee) vs light explicitly. */
    theme?: DashboardAppTheme;
    /** Host-driven refresh counter; incrementing triggers refetch in useExternalData. */
    refreshSignal?: number;
    /** Persist config changes back to the dashboard store (widget.data). */
    onUpdateConfig?: (data: TData) => void;
    /** Register a toggle function the host calls when the user clicks Configure/Edit. */
    onConfigureReady?: (toggleFn: () => void) => void;
}
/**
 * AI prompt configuration declared by a widget package.
 * Used to create kind-level template Prompt/JsonSchema entities and
 * seed per-instance prompts.
 */
export interface WidgetPromptConfig {
    defaultPrompt: string;
    systemInstruction?: string;
    model?: string;
    aiOutputSchema: z.ZodSchema;
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
    /**
     * Zod schema for payloads this widget **publishes** to ValidatedTopicStore.
     * Omit or set to undefined for subscribe-only widgets.
     */
    outputSchema?: z.ZodSchema;
    component: Component<StandardWidgetProps<TData>>;
    defaultData: TData;
    defaultSize: {
        colSpan: number;
        rowSpan: number;
    };
    /** Services this widget requires from the host (informational). */
    capabilities?: string[];
    /** Palette metadata for the host "Add Widget" UI. */
    palette?: {
        icon: string;
        category?: string;
    };
    /** AI prompt configuration — if present, the widget supports AI generation. */
    promptConfig?: WidgetPromptConfig;
}
/** Provides typed access to host-injected service instances. */
export interface ServiceAccessor {
    get<S = unknown>(name: string): S | undefined;
    has(name: string): boolean;
}
/** Lightweight description of an available topic for a widget type. */
export interface TopicEntry {
    topic: string;
    isCurrent: boolean;
    /** Snapshot of the data currently stored at this topic (for preview). */
    data?: Record<string, unknown>;
}
/** Lightweight description of a data stream (AI-generated or manual). */
export interface StreamEntry {
    id: string;
    topic: string;
    title: string;
    schemaId: string;
    source: string;
}
/** Read-only access to the host's stream catalog. */
export interface HostStreamCatalog {
    list(): StreamEntry[];
    getByTopic(topic: string): Pick<StreamEntry, 'id' | 'title'> | undefined;
    filterBySchemaId(schemaId: string): StreamEntry[];
}
/** Status of a named host service (Supabase, fetch, MCP, etc.). */
export interface ServiceStatus {
    name: string;
    available: boolean;
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
    /**
     * Publish validated data to a widget's output topic.
     * Returns false if the widget kind has no registered output schema.
     */
    publishWidgetOutput?(kind: string, widgetId: string, data: unknown): boolean;
    /** Service registry -- host provides named service instances. */
    services?: ServiceAccessor;
    /** Return the topics available for a given widget kind, marking the current one. */
    getAvailableTopics?(kind: string, widgetId: string): TopicEntry[];
    /** Change (or clear) the topic override for a widget. */
    setTopicOverride?(widgetId: string, topic: string | undefined): void;
    /** Return the current topic override for a widget (undefined = using default). */
    getCurrentTopicOverride?(widgetId: string): string | undefined;
    /** Read-only access to the host's AI / manual stream catalog. */
    streams?: HostStreamCatalog;
    /** Enter or exit fullscreen for a widget. */
    setWidgetFullscreen?(widgetId: string, fullscreen: boolean): void;
    /** Snapshot of which host services are available. */
    getServiceStatus?(): ServiceStatus[];
}
