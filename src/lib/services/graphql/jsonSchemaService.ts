/**
 * @deprecated Use Extraction-based data flow instead. Schemas are stored
 * inline on Extraction records as AWSJSON. Both JsonSchema and
 * EntityDefinition are superseded by the Extraction model.
 */

import { M_CREATE_JSON_SCHEMA, M_UPDATE_JSON_SCHEMA } from '$lib/services/graphql/jsonSchemaOperations';
import type { IGraphQLQueryClient } from '$lib/services/realtime/store/GraphQLQueryClient';

export interface JsonSchemaEntity {
	id: string;
	name: string;
	description?: string;
	schemaDefinition: string;
	sharingMode?: string;
	sourceJsonSchemaId?: string;
}

/**
 * @deprecated Use ensureEntityDefinition from entityDefinitionService.ts instead.
 * Create or update a JsonSchema entity and return its ID.
 * If existingJsonSchemaId is provided, updates that entity; otherwise creates a new one.
 */
export async function ensureJsonSchemaEntity(
	queryClient: IGraphQLQueryClient,
	schema: { name: string; description?: string; schemaDefinition: unknown },
	existingJsonSchemaId?: string
): Promise<string> {
	const schemaDefString =
		typeof schema.schemaDefinition === 'string'
			? schema.schemaDefinition
			: JSON.stringify(schema.schemaDefinition);

	if (existingJsonSchemaId) {
		const result = await queryClient.query<{ updateJsonSchema: JsonSchemaEntity }>(
			M_UPDATE_JSON_SCHEMA,
			{
				id: existingJsonSchemaId,
				input: {
					name: schema.name,
					description: schema.description || undefined,
					schemaDefinition: schemaDefString
				}
			}
		);
		return result?.updateJsonSchema?.id ?? existingJsonSchemaId;
	}

	const result = await queryClient.query<{ createJsonSchema: JsonSchemaEntity }>(
		M_CREATE_JSON_SCHEMA,
		{
			input: {
				name: schema.name,
				description: schema.description || undefined,
				schemaDefinition: schemaDefString,
				sharingMode: 'PRIVATE'
			}
		}
	);
	if (!result?.createJsonSchema?.id) {
		throw new Error('Failed to create JsonSchema entity');
	}
	return result.createJsonSchema.id;
}
