import type { Component } from 'svelte';
import type { z } from 'zod';

/**
 * Standard props every widget component receives from the host dashboard.
 * Widget authors should declare their component's Props to extend or match this shape.
 */
/** Host app theme (light / dark / warm “coffee”). Optional; widgets may fall back to darkMode. */
export type DashboardAppTheme = 'light' | 'dark' | 'warm';

/** BaseWidget-level metadata editable through the configure panel. */
export interface WidgetMeta {
	title?: string;
	description?: string;
	showTitle?: boolean;
	showDescription?: boolean;
}

export interface StandardWidgetProps<TData = unknown> {
	data: TData;
	widgetId?: string;
	topicOverride?: string;
	darkMode?: boolean;
	/** When set, widgets can style for warm (coffee) vs light explicitly. */
	theme?: DashboardAppTheme;
	/** Host-driven refresh counter; incrementing triggers refetch in useExternalData. */
	refreshSignal?: number;
	/** When true the widget title bar displays the title. Defaults to true when a title exists. */
	showTitleInChrome?: boolean;
	/** When true the widget title bar displays the description. Defaults to true when a description exists. */
	showDescriptionInChrome?: boolean;
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
	/** Transform raw AI output into the shape the widget's zodSchema expects. */
	mapAiOutput?: (aiOutput: Record<string, unknown>) => Record<string, unknown>;
}

/**
 * Declares a structured EntityDefinition that the widget produces.
 * During registration the host will create (or reuse) a matching
 * EntityDefinition in the ontology graph so it appears on the
 * Ontology Explorer page.
 */
export interface WidgetEntityDefinitionConfig {
	name: string;
	description?: string;
	/** Zod schema describing the structured output shape. Converted to JSON Schema at registration time. */
	outputSchema: z.ZodSchema;
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
	defaultSize: { colSpan: number; rowSpan: number };
	/** Services this widget requires from the host (informational). */
	capabilities?: string[];
	/** Palette metadata for the host "Add Widget" UI. */
	palette?: { icon: string; category?: string };
	/** AI prompt configuration — if present, the widget supports AI generation. */
	promptConfig?: WidgetPromptConfig;
	/**
	 * Explicit EntityDefinition for the widget's structured output.
	 * When omitted but `promptConfig` is present, the EntityDefinition is
	 * auto-derived from `promptConfig.aiOutputSchema` for backward compatibility.
	 */
	entityDefinition?: WidgetEntityDefinitionConfig;
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

/** Data shape passed between the host and the PromptEditor on the AI tab. */
export interface WidgetPromptEditData {
	promptId?: string;
	name: string;
	description: string;
	userPrompt: string;
	systemInstruction: string;
	model: string;
	responseFormatType: 'text' | 'json_object' | 'json_schema';
	schemaProperties: Record<string, Record<string, unknown>>;
	schemaRequired: string[];
	fieldOrder: string[];
	temperature?: number;
	maxTokens?: number;
	topP?: number;
	frequencyPenalty?: number;
	stopSequences: string;
}

/** Raw database records returned by the Debug tab for inspection. */
export interface WidgetDebugData {
	widget: Record<string, unknown>;
	prompt: Record<string, unknown> | null;
	jsonSchema: Record<string, unknown> | null;
	entityDefinition: Record<string, unknown> | null;
	entityInstance: Record<string, unknown> | null;
	topic: {
		path: string;
		data: unknown;
		schema?: Record<string, unknown>;
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
		/** Read-merge-publish: update specific fields without clobbering the rest. */
		patch(topic: string, partial: Record<string, unknown>): boolean;
		/** Look up a registered schema definition by its id. */
		getSchemaById?(id: string): { name?: string; description?: string } | undefined;
		/** Look up the raw JSON Schema object for a registered schema by id. */
		getJsonSchemaById?(id: string): Record<string, unknown> | undefined;
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

	/** Load the widget's prompt data for editing. Returns null if widget has no prompt config. */
	loadWidgetPrompt?(kind: string, widgetId: string): Promise<WidgetPromptEditData | null>;

	/** Save prompt changes and run AI to populate the widget with new data. */
	saveAndRunWidgetPrompt?(kind: string, widgetId: string, data: WidgetPromptEditData): Promise<void>;

	/** Snapshot of which host services are available. */
	getServiceStatus?(): ServiceStatus[];

	/** Store a tab preference that WidgetConfigureBack will consume on next open. */
	setRequestedConfigureTab?(widgetId: string, tab: string): void;
	/** Read and clear the pending tab request for a widget (returns undefined when none). */
	consumeRequestedConfigureTab?(widgetId: string): string | undefined;

	/** Fetch raw DB records for the widget's linked entities (debug/inspection). */
	loadWidgetDebugData?(kind: string, widgetId: string): Promise<WidgetDebugData | null>;

	/** Read current BaseWidget-level meta for display in the configure panel. */
	getWidgetMeta?(widgetId: string): WidgetMeta | undefined;

	/** Partial update of BaseWidget-level properties (title, description, display flags). */
	updateWidgetMeta?(widgetId: string, meta: Partial<WidgetMeta>): void;
}
