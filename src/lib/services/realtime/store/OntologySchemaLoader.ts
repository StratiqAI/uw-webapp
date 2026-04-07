/**
 * OntologySchemaLoader
 *
 * Fetches entity definitions from AppSync and registers their
 * `normalizedJsonSchema` as VTS schemas so instance data published to
 * `ontology/p/+/def/{defId}/inst/+/data` is validated at the store boundary.
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

	constructor(
		private store: IValidatedTopicStore,
		private queryClient: IGraphQLQueryClient,
	) {}

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
	 */
	registerDefinitionSchema(def: EntityDefinition): void {
		this.definitions.set(def.id, def);

		if (def.normalizedJsonSchema) {
			try {
				const parsed: JsonSchemaDefinition =
					typeof def.normalizedJsonSchema === 'string'
						? JSON.parse(def.normalizedJsonSchema)
						: def.normalizedJsonSchema;

				this.store.registerSchema({
					id: `ontology:def:${def.id}`,
					name: def.name,
					description: def.description ?? undefined,
					source: 'code',
					topicPattern: buildOntologySchemaPattern(def.id),
					jsonSchema: parsed,
				});
			} catch (err) {
				log.error(`Failed to register schema for definition ${def.id}:`, err);
			}
		}

		this.store.publish(toOntologyDefTopic(def.projectId, def.id), def);
	}

	/**
	 * Remove a definition from the internal cache and clear its VTS data.
	 * Note: VTS does not support un-registering schemas at the moment, so the
	 * AJV validator for this definition's pattern will persist until a page
	 * reload. The cached metadata and topic data are cleaned up immediately.
	 */
	unregisterDefinitionSchema(definitionId: string, projectId: string): void {
		this.definitions.delete(definitionId);
		this.store.clearAllAt(toOntologyDefTopic(projectId, definitionId));
	}

	getLoadedDefinitions(): Map<string, EntityDefinition> {
		return this.definitions;
	}

	getDefinition(definitionId: string): EntityDefinition | undefined {
		return this.definitions.get(definitionId);
	}
}
