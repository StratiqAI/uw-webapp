/**
 * @deprecated Use useExtraction hook instead. The extraction-based flow
 * eliminates the need for structural hash matching. Widgets bind to
 * Extraction records by extractionId. Kept for backward compatibility
 * with the Ontology Explorer page.
 *
 * Svelte 5 rune hook for ontology-to-widget matchmaking.
 */

import { validatedTopicStore } from '$lib/stores/validatedTopicStore';
import type { EntityDefinition } from '@stratiqai/types-simple';
import {
	toOntologyDefTopic,
	isSchemaCompatible,
} from '$lib/services/realtime/store/ontologyClientHelpers';

export interface WidgetMatch {
	schemaId: string;
	pattern: string;
}

/**
 * Returns a reactive list of widget schemas whose required properties are
 * satisfied by the given entity definition's schema.
 *
 * @param projectId - The project to look up the definition in VTS
 * @param structuralHash - The structuralHash used as the topic key
 */
export function useOntologyWidgetMatch(projectId: string, structuralHash: string) {
	const store = validatedTopicStore;

	const matches = $derived.by((): WidgetMatch[] => {
		const _ = store.schemaVersion;
		const defTopic = toOntologyDefTopic(projectId, structuralHash);
		const def = store.at<EntityDefinition>(defTopic);
		if (!def?.normalizedJsonSchema) return [];

		const defSchema =
			typeof def.normalizedJsonSchema === 'string'
				? JSON.parse(def.normalizedJsonSchema)
				: def.normalizedJsonSchema;

		const allSchemas = store.getRegisteredSchemas();
		return allSchemas
			.filter((s) => s.id?.startsWith('widget:'))
			.filter((s) => isSchemaCompatible(defSchema, s.schema as Record<string, unknown>))
			.map((s) => ({ schemaId: s.id!, pattern: s.pattern }));
	});

	return {
		get matches() {
			return matches;
		},
	};
}

/**
 * Reactive variant that accepts dynamic projectId / structuralHash via closures.
 */
export function useReactiveOntologyWidgetMatch(
	projectId: () => string,
	structuralHash: () => string,
) {
	const store = validatedTopicStore;

	const matches = $derived.by((): WidgetMatch[] => {
		const _ = store.schemaVersion;
		const pid = projectId();
		const hash = structuralHash();
		if (!pid || !hash) return [];

		const defTopic = toOntologyDefTopic(pid, hash);
		const def = store.at<EntityDefinition>(defTopic);
		if (!def?.normalizedJsonSchema) return [];

		const defSchema =
			typeof def.normalizedJsonSchema === 'string'
				? JSON.parse(def.normalizedJsonSchema)
				: def.normalizedJsonSchema;

		const allSchemas = store.getRegisteredSchemas();
		return allSchemas
			.filter((s) => s.id?.startsWith('widget:'))
			.filter((s) => isSchemaCompatible(defSchema, s.schema as Record<string, unknown>))
			.map((s) => ({ schemaId: s.id!, pattern: s.pattern }));
	});

	return {
		get matches() {
			return matches;
		},
	};
}
