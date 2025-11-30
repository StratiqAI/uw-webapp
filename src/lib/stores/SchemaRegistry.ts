import { z } from 'zod';
import type { DynamicSchemaDefinition, FieldDefinition } from '$lib/types/models';

type Validator = (data: unknown) => { success: boolean; data?: any; error?: any };

export class SchemaRegistry {
	private validators = new Map<string, Validator>();
	private definitions = new Map<string, DynamicSchemaDefinition>();

	/**
	 * Recursive helper to build Zod Schema from JSON Definition
	 */
	private buildZodType(field: FieldDefinition): z.ZodTypeAny {
		let validator: z.ZodTypeAny;

		switch (field.type) {
			case 'string':
				validator = z.string();
				break;
			case 'number':
				validator = z.number();
				break;
			case 'boolean':
				validator = z.boolean();
				break;
			case 'date':
				validator = z.string().datetime();
				break;
			case 'enum':
				if (!field.options || field.options.length === 0) {
					validator = z.string(); // Fallback if no options provided
				} else {
					validator = z.enum(field.options as [string, ...string[]]);
				}
				break;

			// Complex: Object
			case 'object':
				if (!field.subFields) {
					validator = z.record(z.any()); // Fallback: generic key-value
				} else {
					const shape: Record<string, z.ZodTypeAny> = {};
					field.subFields.forEach((sub) => {
						shape[sub.name] = this.buildZodType(sub);
					});
					validator = z.object(shape);
				}
				break;

			// Complex: Array
			case 'array':
				const innerDef: FieldDefinition = {
					name: 'item',
					type: field.itemType || 'string',
					required: true,
					subFields: field.subFields, // Pass structure if array contains objects
					options: field.options
				};
				validator = z.array(this.buildZodType(innerDef));
				break;

			default:
				validator = z.any();
		}

		// Constraints & Optionality
		if (field.type === 'number') {
			if (field.min !== undefined) {
				validator = (validator as z.ZodNumber).min(field.min);
			}
			if (field.max !== undefined) {
				validator = (validator as z.ZodNumber).max(field.max);
			}
		}
		if (!field.required) {
			validator = validator.optional();
		}

		return validator;
	}

	/**
	 * Public API: Register a Schema
	 */
	register(def: DynamicSchemaDefinition) {
		this.definitions.set(def.id, def);

		// Build root object schema
		const shape: Record<string, z.ZodTypeAny> = {};
		def.fields.forEach((field) => {
			shape[field.name] = this.buildZodType(field);
		});

		const zodSchema = z.object(shape);

		// Store compiled validator
		this.validators.set(def.id, (data) => zodSchema.safeParse(data));
	}

	getValidator(schemaId: string): Validator | undefined {
		return this.validators.get(schemaId);
	}

	getDefinition(schemaId: string): DynamicSchemaDefinition | undefined {
		return this.definitions.get(schemaId);
	}

	getAllDefinitions(): DynamicSchemaDefinition[] {
		return Array.from(this.definitions.values());
	}
}

export const schemaRegistry = new SchemaRegistry();

