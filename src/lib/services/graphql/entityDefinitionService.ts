/**
 * Shared EntityDefinition entity management utilities.
 *
 * All structured output schemas must be persisted as EntityDefinition entities
 * and referenced via entityDefinitionId. Use ensureEntityDefinition for create-or-update.
 */

import { M_CREATE_ENTITY_DEFINITION, M_UPDATE_ENTITY_DEFINITION } from '$lib/services/graphql/entityDefinitionOperations';
import type { IGraphQLQueryClient } from '$lib/services/realtime/store/GraphQLQueryClient';

export interface EntityDefinitionEntity {
	id: string;
	name: string;
	description?: string;
	schemaDefinition: string;
	sharingMode?: string;
	sourceEntityDefinitionId?: string;
}

/**
 * Create or update an EntityDefinition entity and return its ID.
 * If existingEntityDefinitionId is provided, updates that entity; otherwise creates a new one.
 */
export async function ensureEntityDefinition(
	queryClient: IGraphQLQueryClient,
	schema: { name: string; description?: string; schemaDefinition: unknown },
	existingEntityDefinitionId?: string
): Promise<string> {
	const schemaDefString =
		typeof schema.schemaDefinition === 'string'
			? schema.schemaDefinition
			: JSON.stringify(schema.schemaDefinition);

	if (existingEntityDefinitionId) {
		const result = await queryClient.query<{ updateEntityDefinition: EntityDefinitionEntity }>(
			M_UPDATE_ENTITY_DEFINITION,
			{
				id: existingEntityDefinitionId,
				input: {
					name: schema.name,
					description: schema.description || undefined,
					schemaDefinition: schemaDefString
				}
			}
		);
		return result?.updateEntityDefinition?.id ?? existingEntityDefinitionId;
	}

	const result = await queryClient.query<{ createEntityDefinition: EntityDefinitionEntity }>(
		M_CREATE_ENTITY_DEFINITION,
		{
			input: {
				name: schema.name,
				description: schema.description || undefined,
				schemaDefinition: schemaDefString,
				sharingMode: 'PRIVATE'
			}
		}
	);
	if (!result?.createEntityDefinition?.id) {
		throw new Error('Failed to create EntityDefinition entity');
	}
	return result.createEntityDefinition.id;
}
