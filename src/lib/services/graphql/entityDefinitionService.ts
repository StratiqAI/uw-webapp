/**
 * EntityDefinition creation/update service.
 *
 * Replaces direct JsonSchema creation — all schema persistence now goes
 * through saveEntityDefinition, which auto-creates a linked JsonSchema
 * via the backend pipeline (computeStructuralHash + ensureJsonSchemaForDef).
 */

import { M_SAVE_ENTITY_DEFINITION } from '@stratiqai/types-simple';
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
 * When existingEntityDefinitionId is provided, the existing definition is
 * overwritten (upsert). Otherwise a new UUID is generated.
 */
export async function ensureEntityDefinition(
	queryClient: IGraphQLQueryClient,
	projectId: string,
	schema: { name: string; description?: string; schemaDefinition: unknown },
	existingEntityDefinitionId?: string
): Promise<{ entityDefinitionId: string; jsonSchemaId: string }> {
	const schemaDefString =
		typeof schema.schemaDefinition === 'string'
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
