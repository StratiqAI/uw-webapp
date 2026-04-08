/**
 * OntologySchemaLoader
 *
 * Fetches entity definitions from AppSync and registers their
 * `normalizedJsonSchema` as VTS schemas so instance data published to
 * `ontology/p/+/schema/{hash}/inst/+/data` is validated at the store boundary.
 *
 * Topic paths are keyed by structuralHash (not definitionId), enabling
 * schema-hash-based discovery across widget types.
 *
 * Also publishes definition metadata to VTS at the definition topic.
 */

import type { EntityDefinition } from '@stratiqai/types-simple';
import { Q_LIST_ENTITY_DEFINITIONS } from '@stratiqai/types-simple';
import type { IGraphQLQueryClient } from './GraphQLQueryClient';
import type { SchemaRegistration } from '$lib/stores/validatedTopicStore';
import type { JsonSchemaDefinition } from '$lib/types/models';
import {
	toOntologyDefTopic,
	buildOntologySchemaPattern,
} from './ontologyClientHelpers';
import { createLogger } from '$lib/utils/logger';

const log = createLogger('ontology-schema');

interface IValidatedTopicStore {
	publish<T = unknown>(topic: string, value: T): boolean;
	delete(topic: string): void;
	clearAllAt(path: string, options?: { exclude?: string[] }): void;
	registerSchema(registration: SchemaRegistration): void;
}

export class OntologySchemaLoader {
	private definitions = new Map<string, EntityDefinition>();
	private publishProjectId: string | null = null;

	constructor(
		private store: IValidatedTopicStore,
		private queryClient: IGraphQLQueryClient,
	) {}

	/**
	 * Set the project ID under which all definitions should be published
	 * in VTS, regardless of which backend project they were loaded from.
	 * This ensures system definitions appear under the active project's
	 * topic tree.
	 */
	setPublishProjectId(projectId: string): void {
		this.publishProjectId = projectId;
	}

	/**
	 * Fetch all definitions for a project and register their schemas + metadata
	 * into VTS.
	 */
	async loadDefinitions(projectId: string): Promise<EntityDefinition[]> {
		const result = await this.queryClient.query<{
			listEntityDefinitions: EntityDefinition[] | null;
		}>(Q_LIST_ENTITY_DEFINITIONS, { projectId });

		const defs = result.listEntityDefinitions ?? [];

		for (const def of defs) {
			this.registerDefinitionSchema(def);
		}

		log.debug(`Loaded ${defs.length} definitions for project ${projectId}`);
		return defs;
	}

	/**
	 * Register (or re-register) a single definition's normalizedJsonSchema as a
	 * VTS schema and publish its metadata to the definition topic.
	 *
	 * Uses structuralHash for topic paths. Publishes under publishProjectId
	 * (if set) rather than def.projectId, so system definitions appear in the
	 * active project's topic tree.
	 */
	registerDefinitionSchema(def: EntityDefinition): void {
		this.definitions.set(def.id, def);

		const hash = def.structuralHash;
		if (!hash) {
			log.warn(`Definition ${def.id} (${def.name}) has no structuralHash, skipping VTS registration`);
			return;
		}

		const topicProjectId = this.publishProjectId ?? def.projectId;

		if (def.normalizedJsonSchema) {
			try {
				const parsed: JsonSchemaDefinition =
					typeof def.normalizedJsonSchema === 'string'
						? JSON.parse(def.normalizedJsonSchema)
						: def.normalizedJsonSchema;

				this.store.registerSchema({
					id: `ontology:schema:${hash}`,
					name: def.name,
					description: def.description ?? undefined,
					source: 'code',
					topicPattern: buildOntologySchemaPattern(hash),
					jsonSchema: parsed,
				});
			} catch (err) {
				log.error(`Failed to register schema for definition ${def.id}:`, err);
			}
		}

		this.store.publish(toOntologyDefTopic(topicProjectId, hash), def);
	}

	/**
	 * Remove a definition from the internal cache and clear its VTS data.
	 * Note: VTS does not support un-registering schemas at the moment, so the
	 * AJV validator for this definition's pattern will persist until a page
	 * reload. The cached metadata and topic data are cleaned up immediately.
	 */
	unregisterDefinitionSchema(definitionId: string, projectId: string): void {
		const def = this.definitions.get(definitionId);
		this.definitions.delete(definitionId);

		const hash = def?.structuralHash;
		if (!hash) return;

		const topicProjectId = this.publishProjectId ?? projectId;
		this.store.clearAllAt(toOntologyDefTopic(topicProjectId, hash));
	}

	getLoadedDefinitions(): Map<string, EntityDefinition> {
		return this.definitions;
	}

	getDefinition(definitionId: string): EntityDefinition | undefined {
		return this.definitions.get(definitionId);
	}
}
