/**
 * EntityDefinition creation/update service.
 *
 * Replaces direct JsonSchema creation — all schema persistence now goes
 * through saveEntityDefinition, which auto-creates a linked JsonSchema
 * via the backend pipeline (computeStructuralHash + ensureJsonSchemaForDef).
 *
 * Uses structural-hash lookups for idempotency: if a definition with the
 * same normalised schema already exists in the project it is returned
 * without a redundant write.
 */

import {
	M_SAVE_ENTITY_DEFINITION,
	Q_GET_ENTITY_DEFINITION_BY_HASH,
	computeSchemaHash
} from '@stratiqai/types-simple';
import type { RawJsonSchema } from '@stratiqai/types-simple';
import type { IGraphQLQueryClient } from '$lib/services/realtime/store/GraphQLQueryClient';
import { derivePropertiesFromJsonSchema } from './schemaPropertyDeriver';

interface EntityDefinitionResult {
	projectId: string;
	id: string;
	jsonSchemaId?: string;
	name: string;
	jsonSchema: string;
	structuralHash: string;
}

/**
 * Create or upsert an EntityDefinition and return its ID and linked jsonSchemaId.
 *
 * Idempotency: computes the structural hash client-side and queries by hash
 * first. If a matching definition already exists in the project it is
 * returned immediately without writing.
 *
 * When existingEntityDefinitionId is provided, the existing definition is
 * overwritten (upsert). Otherwise a new UUID is generated.
 */
export async function ensureEntityDefinition(
	queryClient: IGraphQLQueryClient,
	projectId: string,
	schema: { name: string; description?: string; schemaDefinition: unknown },
	existingEntityDefinitionId?: string
): Promise<{ entityDefinitionId: string; jsonSchemaId: string }> {
	const schemaObj: RawJsonSchema =
		typeof schema.schemaDefinition === 'string'
			? JSON.parse(schema.schemaDefinition)
			: (schema.schemaDefinition as RawJsonSchema);

	if (!existingEntityDefinitionId) {
		try {
			const structuralHash = await computeSchemaHash(schemaObj);
			const existing = await queryClient.query<{
				getEntityDefinitionByHash: EntityDefinitionResult | null;
			}>(Q_GET_ENTITY_DEFINITION_BY_HASH, { projectId, structuralHash });

			if (existing?.getEntityDefinitionByHash) {
				const def = existing.getEntityDefinitionByHash;
				return {
					entityDefinitionId: def.id,
					jsonSchemaId: def.jsonSchemaId ?? def.structuralHash
				};
			}
		} catch {
			// Hash lookup failed — fall through to create
		}
	}

	const schemaDefString = typeof schema.schemaDefinition === 'string'
		? schema.schemaDefinition
		: JSON.stringify(schema.schemaDefinition);

	const properties = derivePropertiesFromJsonSchema(schema.schemaDefinition);
	const id = existingEntityDefinitionId ?? crypto.randomUUID();

	const result = await queryClient.query<{ saveEntityDefinition: EntityDefinitionResult }>(
		M_SAVE_ENTITY_DEFINITION,
		{
			input: {
				projectId,
				id,
				name: schema.name,
				description: schema.description || undefined,
				jsonSchema: schemaDefString,
				properties
			}
		}
	);

	const def = result?.saveEntityDefinition;
	if (!def?.id) {
		throw new Error('Failed to save EntityDefinition');
	}

	return {
		entityDefinitionId: def.id,
		jsonSchemaId: def.jsonSchemaId ?? def.structuralHash
	};
}
