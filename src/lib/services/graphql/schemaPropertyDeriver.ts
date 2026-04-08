/**
 * Derives PropertyDefinitionInput[] from a raw JSON Schema object.
 * Used to populate the `properties` field when saving an EntityDefinition.
 */

export type PropertyDataType = 'STRING' | 'NUMBER' | 'BOOLEAN' | 'DATE' | 'CALCULATION';

export interface PropertyDefinitionInput {
	name: string;
	description?: string;
	dataType: PropertyDataType;
	path: string;
	isList?: boolean;
}

function mapJsonSchemaType(prop: Record<string, unknown>): { dataType: PropertyDataType; isList: boolean } {
	const type = prop.type as string | undefined;
	const format = prop.format as string | undefined;

	if (type === 'array') {
		const items = prop.items as Record<string, unknown> | undefined;
		const inner = items ? mapJsonSchemaType(items) : { dataType: 'STRING' as PropertyDataType };
		return { dataType: inner.dataType, isList: true };
	}

	if (format === 'date' || format === 'date-time') return { dataType: 'DATE', isList: false };
	if (type === 'number' || type === 'integer') return { dataType: 'NUMBER', isList: false };
	if (type === 'boolean') return { dataType: 'BOOLEAN', isList: false };

	return { dataType: 'STRING', isList: false };
}

export function derivePropertiesFromJsonSchema(
	schemaDefinition: unknown
): PropertyDefinitionInput[] {
	const schema =
		typeof schemaDefinition === 'string'
			? (JSON.parse(schemaDefinition) as Record<string, unknown>)
			: (schemaDefinition as Record<string, unknown>);

	const properties = schema?.properties as Record<string, Record<string, unknown>> | undefined;
	if (!properties || typeof properties !== 'object') return [];

	return Object.entries(properties).map(([name, prop]) => {
		const { dataType, isList } = mapJsonSchemaType(prop);
		return {
			name,
			description: (prop.description as string) || undefined,
			dataType,
			path: `$.${name}`,
			isList: isList || undefined
		};
	});
}
