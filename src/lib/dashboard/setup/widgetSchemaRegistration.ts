/**
 * Widget Schema Registration
 *
 * Registers all widget schemas (built-in and package-based) with the
 * unified ValidatedTopicStore. Each registration includes an ID, metadata,
 * topic pattern, and JSON Schema for both catalog queries and publish()
 * validation.
 *
 * Also computes and caches structuralHash values for each widget kind,
 * enabling schema-hash-based topic discovery in the ontology namespace.
 *
 * Call initializeWidgetSchemas() once at app startup, then
 * initializeWidgetHashes() (async) to populate the hash cache.
 */

import { validatedTopicStore } from '$lib/stores/validatedTopicStore';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { WidgetDataSchemas } from '$lib/dashboard/types/widgetSchemas';
import type { WidgetType } from '$lib/dashboard/types/widget';
import type { JsonSchemaDefinition } from '$lib/types/models';
import type { RawJsonSchema } from '@stratiqai/types-simple';
import { computeSchemaHash } from '@stratiqai/types-simple';
import { getRegisteredManifests, getWidgetManifest } from '$lib/dashboard/setup/widgetRegistry';
import { createLogger } from '$lib/utils/logger';

const log = createLogger('widgets');

const WIDGET_NAMES: Record<WidgetType, string> = {
	paragraph: 'Paragraph Widget',
	table: 'Table Widget',
	title: 'Title Widget',
	image: 'Image Widget',
	lineChart: 'Line Chart Widget',
	barChart: 'Bar Chart Widget',
	donutChart: 'Donut Chart Widget',
	areaChart: 'Area Chart Widget',
	gauge: 'Gauge Widget',
	sparkline: 'Sparkline Widget',
	heatmap: 'Heatmap Widget',
	divergingBarChart: 'Diverging Bar Chart Widget',
	metric: 'Metric Widget',
	map: 'Map Widget',
	schema: 'Schema Widget',
	locationQuotient: 'Location Quotient Widget',
	jsonViewer: 'JSON Viewer',
	brokerCard: 'Broker Card',
	lqAnalysis: 'LQ Analysis',
	proFormaRevenue: 'Pro Forma Revenue',
	proFormaOpEx: 'Pro Forma OpEx',
	proFormaNoi: 'Pro Forma NOI',
	proFormaUnleveredCf: 'Pro Forma Unlevered CF',
	proFormaLeveredCf: 'Pro Forma Levered CF',
	proFormaUnleveredReturns: 'Pro Forma Unlevered Returns',
	proFormaLeveredReturns: 'Pro Forma Levered Returns',
	econBaseMultiplier: 'Economic Base Multiplier',
	industryTrendScorecard: 'Industry Trend Scorecard',
	lfprDashboard: 'LFPR Dashboard',
	mapbox3d: 'Mapbox 3D Model'
};

/** Built-in widget types registered via the old hardcoded loop. Empty now that
 *  all widgets are packaged; kept for backwards compat of the export. */
export const WIDGET_TYPES: WidgetType[] = [];

let schemasRegistered = false;

function zodToCleanJsonSchema(zodSchema: unknown, name: string): JsonSchemaDefinition {
	const raw = zodToJsonSchema(zodSchema as Parameters<typeof zodToJsonSchema>[0], {
		name,
		$refStrategy: 'none'
	}) as Record<string, unknown>;

	const { $schema, ...clean } = raw; 

	if (clean.$ref && clean.definitions) {
		const refPath = (clean.$ref as string).replace('#/definitions/', '');
		const defs = clean.definitions as Record<string, Record<string, unknown>>;
		if (defs[refPath]) {
			return defs[refPath] as JsonSchemaDefinition;
		}
	}

	return clean as JsonSchemaDefinition;
}

export function initializeWidgetSchemas(): void {
	if (schemasRegistered) return;

	for (const widgetType of WIDGET_TYPES) {
		const schemaId = `widget:${widgetType}-v1`;
		const zodSchema = WidgetDataSchemas[widgetType];
		const name = WIDGET_NAMES[widgetType];
		const topicPattern = `widgets/${widgetType}/+`;

		try {
			validatedTopicStore.registerSchema({
				id: schemaId,
				name,
				description: `Data schema for ${name.toLowerCase()}`,
				source: 'code',
				topicPattern,
				jsonSchema: zodToCleanJsonSchema(zodSchema, `${widgetType}WidgetData`)
			});
		} catch (error) {
			log.error(`Failed to register ${schemaId}:`, error);
			throw error;
		}
	}

	for (const manifest of getRegisteredManifests()) {
		const schemaId = `widget:${manifest.kind}-${manifest.schemaVersion}`;
		const topicPattern = `widgets/${manifest.kind}/+`;
		const topicZod = manifest.inputSchema ?? manifest.zodSchema;

		try {
			validatedTopicStore.registerSchema({
				id: schemaId,
				name: manifest.displayName,
				description: `Data schema for ${manifest.displayName.toLowerCase()}`,
				source: 'code',
				topicPattern,
				jsonSchema: zodToCleanJsonSchema(topicZod, `${manifest.kind}WidgetData`)
			});
		} catch (error) {
			log.error(`Failed to register package widget ${schemaId}:`, error);
		}

		if (manifest.outputSchema) {
			const outputSchemaId = `widget:${manifest.kind}-out-${manifest.schemaVersion}`;
			const outputTopicPattern = `widgets/${manifest.kind}/+/out`;
			try {
				validatedTopicStore.registerSchema({
					id: outputSchemaId,
					name: `${manifest.displayName} Output`,
					description: `Output schema for ${manifest.displayName.toLowerCase()}`,
					source: 'code',
					topicPattern: outputTopicPattern,
					jsonSchema: zodToCleanJsonSchema(manifest.outputSchema, `${manifest.kind}WidgetOutput`)
				});
			} catch (error) {
				log.error(`Failed to register output schema ${outputSchemaId}:`, error);
			}
		}
	}

	schemasRegistered = true;
}

// ---------------------------------------------------------------------------
// Structural hash cache (populated by initializeWidgetHashes)
// ---------------------------------------------------------------------------

const widgetStructuralHashes = new Map<string, string>();
let hashesReady: Promise<void> | null = null;

/**
 * Compute and cache the structuralHash for every registered widget manifest.
 * Safe to call multiple times; only the first invocation does work.
 * Must be called after registerWidget() has been called for all manifests.
 */
export function initializeWidgetHashes(): Promise<void> {
	if (hashesReady) return hashesReady;

	hashesReady = (async () => {
		const manifests = getRegisteredManifests();
		await Promise.all(
			manifests.map(async (manifest) => {
				const zodSchema = manifest.inputSchema ?? manifest.zodSchema;
				const jsonSchema = zodToCleanJsonSchema(zodSchema, `${manifest.kind}WidgetData`);
				try {
					const hash = await computeSchemaHash(jsonSchema as RawJsonSchema);
					widgetStructuralHashes.set(manifest.kind, hash);
					log.debug(`Computed structuralHash for ${manifest.kind}: ${hash.slice(0, 12)}...`);
				} catch (err) {
					log.error(`Failed to compute structuralHash for ${manifest.kind}:`, err);
				}
			})
		);
	})();

	return hashesReady;
}

/**
 * Returns the cached structuralHash for a widget kind.
 * Returns undefined if hashes have not yet been initialized or
 * if the kind is not registered.
 */
export function getWidgetStructuralHash(kind: string): string | undefined {
	return widgetStructuralHashes.get(kind);
}

/**
 * Wait for the hash cache to be fully populated.
 * Useful for callers that need the hash synchronously after await.
 */
export function awaitWidgetHashes(): Promise<void> {
	return hashesReady ?? Promise.resolve();
}

/**
 * Returns the input schema id for any widget type (built-in or package-based).
 * Checks the manifest registry first, then falls back to the built-in convention.
 */
export function getWidgetSchemaId(widgetType: WidgetType | string): string {
	const manifest = getWidgetManifest(widgetType);
	if (manifest) {
		return `widget:${manifest.kind}-${manifest.schemaVersion}`;
	}
	return `widget:${widgetType}-v1`;
}

export function getWidgetDisplayName(widgetType: string): string {
	const manifest = getWidgetManifest(widgetType);
	if (manifest) return manifest.displayName;
	return WIDGET_NAMES[widgetType as WidgetType] ?? widgetType;
}

/**
 * Returns the output schema id for a widget type, or null if the widget
 * does not publish (subscribe-only / no outputSchema on the manifest).
 */
export function getWidgetOutputSchemaId(widgetType: string): string | null {
	const manifest = getWidgetManifest(widgetType);
	if (manifest?.outputSchema) {
		return `widget:${manifest.kind}-out-${manifest.schemaVersion}`;
	}
	return null;
}

export function getWidgetTopic(widgetType: WidgetType | string, widgetId: string, topicOverride?: string): string {
	if (topicOverride) {
		return topicOverride;
	}
	return `widgets/${widgetType}/${widgetId}`;
}

export function getWidgetTopicsByType(widgetType: WidgetType): Array<{ id: string; data: unknown }> {
	const basePath = `widgets/${widgetType}`;
	return validatedTopicStore.getAllAt(basePath);
}
