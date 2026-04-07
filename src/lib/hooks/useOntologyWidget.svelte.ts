/**
 * Svelte 5 rune hook for ontology-to-widget matchmaking.
 *
 * Given a projectId and definitionId, reactively resolves which registered
 * widget schemas are structurally compatible with the entity definition's
 * normalizedSchema stored in VTS.
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
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { useOntologyWidgetMatch } from '$lib/hooks/useOntologyWidget.svelte';
 *
 *   const { matches } = useOntologyWidgetMatch('proj-1', 'def-insurance-policy');
 *   // matches is a reactive array of { schemaId, pattern }
 * </script>
 * ```
 */
export function useOntologyWidgetMatch(projectId: string, definitionId: string) {
	const store = validatedTopicStore;

	const matches = $derived.by((): WidgetMatch[] => {
		const _ = store.schemaVersion;
		const defTopic = toOntologyDefTopic(projectId, definitionId);
		const def = store.at<EntityDefinition>(defTopic);
		const normalizedRaw = (def as any)?.normalizedSchema ?? (def as any)?.normalizedJsonSchema;
		if (!normalizedRaw) return [];

		const defSchema =
			typeof normalizedRaw === 'string'
				? JSON.parse(normalizedRaw)
				: normalizedRaw;

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
 * Reactive variant that accepts dynamic projectId / definitionId via closures.
 */
export function useReactiveOntologyWidgetMatch(
	projectId: () => string,
	definitionId: () => string,
) {
	const store = validatedTopicStore;

	const matches = $derived.by((): WidgetMatch[] => {
		const _ = store.schemaVersion;
		const pid = projectId();
		const did = definitionId();
		if (!pid || !did) return [];

		const defTopic = toOntologyDefTopic(pid, did);
		const def = store.at<EntityDefinition>(defTopic);
		const normalizedRaw = (def as any)?.normalizedSchema ?? (def as any)?.normalizedJsonSchema;
		if (!normalizedRaw) return [];

		const defSchema =
			typeof normalizedRaw === 'string'
				? JSON.parse(normalizedRaw)
				: normalizedRaw;

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
