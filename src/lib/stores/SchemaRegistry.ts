import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import type { DynamicSchemaDefinition, JsonSchemaDefinition } from '$lib/types/models';

type Validator = (data: unknown) => { success: boolean; data?: any; error?: any };

export class SchemaRegistry {
	// Runtime: Store Zod schemas for validation
	private zodSchemas = new Map<string, z.ZodSchema>();
	private validators = new Map<string, Validator>();

	// Storage: Keep JSON Schema for serialization/UI
	private definitions = new Map<string, DynamicSchemaDefinition>();

	// ===== JSON Schema → Zod Compiler =====
	/**
	 * Recursively compile JSON Schema to Zod schema
	 */
	private compileJsonSchemaToZod(node: JsonSchemaDefinition): z.ZodTypeAny {
		let schema: z.ZodTypeAny;

		switch (node.type) {
			case 'string':
				if (node.enum && node.enum.length > 0) {
					schema = z.enum(node.enum as [string, ...string[]]);
				} else {
					schema = z.string();
				}

				// Handle format constraints
				if (node.format === 'date-time') {
					schema = z.string().datetime();
				} else if (node.format === 'email') {
					schema = z.string().email();
				} else if (node.format === 'uri') {
					schema = z.string().url();
				}

				// Handle length constraints
				if (node.minLength !== undefined) {
					schema = (schema as z.ZodString).min(node.minLength);
				}
				if (node.maxLength !== undefined) {
					schema = (schema as z.ZodString).max(node.maxLength);
				}
				break;

			case 'number':
			case 'integer':
				let numSchema = z.number();
				if (node.minimum !== undefined) {
					numSchema = numSchema.min(node.minimum);
				}
				if (node.maximum !== undefined) {
					numSchema = numSchema.max(node.maximum);
				}
				schema = numSchema;
				break;

			case 'boolean':
				schema = z.boolean();
				break;

			case 'object':
				const shape: Record<string, z.ZodTypeAny> = {};
				if (node.properties) {
					for (const [key, propDef] of Object.entries(node.properties)) {
						let propSchema = this.compileJsonSchemaToZod(propDef);

						// Handle required/optional
						if (!node.required?.includes(key)) {
							propSchema = propSchema.optional();
						}

						shape[key] = propSchema;
					}
				}
				schema = z.object(shape).passthrough(); // Allow extra keys for forward compatibility
				break;

			case 'array':
				schema = node.items ? z.array(this.compileJsonSchemaToZod(node.items)) : z.array(z.any());
				break;

			default:
				schema = z.any();
		}

		// Add description if present
		if (node.description) {
			schema = schema.describe(node.description);
		}

		return schema;
	}

	// ===== Registration Methods =====

	/**
	 * Method 1: Register from JSON Schema (UI/AI/DB-created schemas)
	 * Compiles: JSON Schema → Zod
	 */
	register(def: DynamicSchemaDefinition) {
		// Validate that root is an object
		if (def.jsonSchema.type !== 'object') {
			throw new Error(
				`Schema ${def.id}: Root schema must be type 'object', got '${def.jsonSchema.type}'`
			);
		}

		// Store definition
		this.definitions.set(def.id, def);

		// Compile JSON Schema → Zod
		const zodSchema = this.compileJsonSchemaToZod(def.jsonSchema);

		// Store Zod schema and validator
		this.zodSchemas.set(def.id, zodSchema);
		this.validators.set(def.id, (data) => zodSchema.safeParse(data));
	}

	/**
	 * Method 2: Register Zod schema directly (code-defined schemas)
	 * Converts: Zod → JSON Schema (for storage)
	 */
	registerZodSchema(
		id: string,
		zodSchema: z.ZodSchema,
		metadata?: { name: string; description?: string }
	) {
		// Convert Zod → JSON Schema (for storage/serialization)
		const jsonSchema = zodToJsonSchema(zodSchema, {
			name: id,
			$refStrategy: 'none'
		}) as JsonSchemaDefinition;

		// Remove $schema property if present
		const { $schema, ...cleanJsonSchema } = jsonSchema as any;

		// Handle $ref structure: zodToJsonSchema sometimes creates a $ref pointing to definitions
		// Example: { $ref: "#/definitions/widget:title-v1", definitions: { "widget:title-v1": { ... } } }
		if (cleanJsonSchema.$ref && cleanJsonSchema.definitions) {
			const refPath = cleanJsonSchema.$ref.replace('#/definitions/', '');
			if (cleanJsonSchema.definitions[refPath]) {
				// Extract the referenced definition as the actual schema
				const referencedSchema = cleanJsonSchema.definitions[refPath];
				// Create a new clean schema from the referenced definition
				const resolvedSchema: any = {
					type: referencedSchema.type || 'object',
					properties: referencedSchema.properties || {},
					required: referencedSchema.required || []
				};
				// Copy other properties from referenced schema
				if (referencedSchema.description) resolvedSchema.description = referencedSchema.description;
				if (referencedSchema.additionalProperties !== undefined) resolvedSchema.additionalProperties = referencedSchema.additionalProperties;
				// Replace cleanJsonSchema with the resolved schema
				Object.keys(cleanJsonSchema).forEach(key => delete cleanJsonSchema[key]);
				Object.assign(cleanJsonSchema, resolvedSchema);
			}
		}

		// Ensure root is object type
		if (cleanJsonSchema.type !== 'object') {
			// Wrap in object if needed
			cleanJsonSchema.type = 'object';
		}

		// Ensure properties exists (even if empty) for object types
		if (cleanJsonSchema.type === 'object' && !cleanJsonSchema.properties) {
			cleanJsonSchema.properties = {};
		}

		// Store definition
		const def: DynamicSchemaDefinition = {
			id,
			name: metadata?.name || id,
			description: metadata?.description,
			jsonSchema: cleanJsonSchema,
			source: 'code'
		};

		this.definitions.set(id, def);

		// Store Zod schema and validator
		this.zodSchemas.set(id, zodSchema);
		this.validators.set(id, (data) => zodSchema.safeParse(data));
	}

	// ===== Retrieval Methods =====

	getValidator(schemaId: string): Validator | undefined {
		return this.validators.get(schemaId);
	}

	getZodSchema(schemaId: string): z.ZodSchema | undefined {
		return this.zodSchemas.get(schemaId);
	}

	getDefinition(schemaId: string): DynamicSchemaDefinition | undefined {
		return this.definitions.get(schemaId);
	}

	getJsonSchema(schemaId: string): JsonSchemaDefinition | undefined {
		return this.definitions.get(schemaId)?.jsonSchema;
	}

	getAllDefinitions(): DynamicSchemaDefinition[] {
		return Array.from(this.definitions.values());
	}
}

export const schemaRegistry = new SchemaRegistry();
