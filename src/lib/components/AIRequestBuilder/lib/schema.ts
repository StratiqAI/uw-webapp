// src/lib/schema.ts

import type { SchemaProperty, Message } from './state';

function buildJsonSchema(props: SchemaProperty[]): any {
	const schema: any = {
		type: 'object',
		properties: {},
		required: [] as string[],
		additionalProperties: false
	};

	for (const prop of props) {
		if (!prop.name) continue;

		if (prop.type === 'object' && prop.properties) {
			schema.properties[prop.name] = buildJsonSchema(prop.properties);
		} else if (prop.type === 'array') {
			schema.properties[prop.name] = {
				type: 'array',
				items:
					prop.itemType === 'object' && prop.itemProperties
						? buildJsonSchema(prop.itemProperties)
						: { type: prop.itemType || 'string' }
			};
		} else {
			schema.properties[prop.name] = {
				type: prop.type
			};
			if (prop.description) {
				schema.properties[prop.name].description = prop.description;
			}
		}

		if (prop.required) {
			schema.required.push(prop.name);
		}
	}

	if (schema.required.length === 0) {
		delete schema.required;
	}

	return schema;
}

export function buildOutput(
	model: string,
	messages: Message[],
	vectorStoreIds: string[],
	schemaName: string,
	strict: boolean,
	properties: SchemaProperty[]
) {
	return {
		model,
		input: messages.map((m) => ({
			role: m.role,
			content: m.content
		})),
		tools: [
			{
				type: 'file_search',
				vector_store_ids: vectorStoreIds.filter((id) => id.trim() !== '')
			}
		],
		tool_choice: 'auto',
		text: {
			format: {
				type: 'json_schema',
				name: schemaName,
				strict,
				schema: {
					...buildJsonSchema(properties),
					$schema: 'http://json-schema.org/draft-07/schema#'
				}
			}
		},
		include: ['output.file_search_call.results']
	};
}
