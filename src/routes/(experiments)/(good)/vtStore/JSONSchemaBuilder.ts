/**
 * JSONSchemaBuilder.ts
 * 
 * Fluent builder class for creating JSON Schemas with best practices.
 * 
 * This class provides a convenient way to build JSON Schemas programmatically
 * with sensible defaults and best practices built-in:
 * - All properties are automatically marked as required
 * - additionalProperties is set to false by default
 * - Provider-specific schema formats (OpenAI, Gemini)
 * 
 * Key Features:
 * - Fluent interface for schema construction
 * - Automatic required field management
 * - Provider-specific schema formatting
 * - Best practices enforcement
 * 
 * Usage:
 *   const builder = new JSONSchemaBuilder({
 *     name: { type: 'string' },
 *     age: { type: 'integer', minimum: 18 }
 *   });
 *   
 *   const schema = builder.build();
 *   const openaiFormat = builder.toOpenAIFormat('userProfile', true);
 */

import type { Schema } from 'ajv';

/**
 * Options for JSONSchemaBuilder
 */
export interface JSONSchemaBuilderOptions {
	schemaVersion?: string;
}

/**
 * JSONSchemaBuilder class for creating JSON schemas from properties
 * 
 * This class provides a fluent interface for building JSON schemas with
 * best practices built-in:
 * - Automatically sets all properties as required (unless specified otherwise)
 * - Sets additionalProperties to false by default
 * - Supports anyOf/oneOf for union types
 * - Provides methods for provider-specific schema formats
 */
export class JSONSchemaBuilder {
	private properties: Record<string, any>;
	private requiredFields: string[] | null;
	private additionalProperties: boolean;
	private schemaVersion: string;

	constructor(
		properties: Record<string, any>,
		options?: JSONSchemaBuilderOptions & {
			required?: string[]; // Optional: specify which fields are required (default: all fields)
		}
	) {
		this.properties = properties;
		// If required fields specified, use those; otherwise mark all as required
		this.requiredFields = options?.required ?? null;
		// Automatically set additionalProperties to false
		// Best practice: prevent extra fields that aren't in the schema
		this.additionalProperties = false;
		// Use provided schema version or default to draft-07
		this.schemaVersion = options?.schemaVersion ?? 'http://json-schema.org/draft-07/schema#';
	}

	/**
	 * Build the full JSON schema object
	 * 
	 * @returns Complete JSON Schema object
	 */
	build(): Schema {
		// Determine required fields: use specified list or default to all properties
		const required = this.requiredFields ?? Object.keys(this.properties);
		
		// Build complete JSON Schema object with all standard fields
		return {
			type: 'object',
			properties: this.properties, // Field definitions (supports anyOf, oneOf, enum, etc.)
			required, // Required fields (can be subset of properties)
			additionalProperties: this.additionalProperties, // false = strict validation
			$schema: this.schemaVersion // Schema version identifier
		};
	}

	/**
	 * Get a cleaned schema for Gemini (removes additionalProperties and $schema)
	 * 
	 * Gemini API doesn't support these fields, so this method provides
	 * a compatible version of the schema.
	 * 
	 * @returns Schema compatible with Google Gemini API
	 */
	buildForGemini(): any {
		// Gemini API doesn't support additionalProperties and $schema fields
		// Return a simplified schema with only supported fields
		return {
			type: 'object',
			properties: this.properties,
			required: this.requiredFields
			// Note: additionalProperties and $schema are omitted for Gemini compatibility
		};
	}

	/**
	 * Get the OpenAI response format config
	 * 
	 * @param name - The name for the schema format
	 * @param strict - Whether to use strict mode (default: true)
	 * @returns OpenAI-compatible response format configuration
	 */
	toOpenAIFormat(
		name: string,
		strict: boolean = true
	): {
		type: 'json_schema';
		name: string;
		strict: boolean;
		schema: Record<string, unknown>;
	} {
		// Format schema for OpenAI's structured output API
		// The 'name' is used internally by OpenAI for the format identifier
		// 'strict: true' enforces exact schema compliance (no extra fields)
		return {
			type: 'json_schema' as const, // OpenAI's structured output format type
			name, // Sanitized pattern name (e.g., 'app_users_' from 'app/users/+')
			strict, // Enforce strict schema validation
			schema: this.build() as Record<string, unknown> // Full JSON Schema
		};
	}
}
