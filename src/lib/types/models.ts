// JSON Schema-based Dynamic Schema System
// Uses standard JSON Schema Draft 07 for storage and AI compatibility
// Compiles to Zod schemas for runtime validation

// ===== JSON Schema Definition (Standard Format) =====
// JSON Schema Draft 07 - compatible with OpenAI Structured Outputs
export interface JsonSchemaDefinition {
	type?: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'integer' | ('object' | 'array' | 'string' | 'number' | 'boolean' | 'integer' | 'null')[];
	description?: string;
	properties?: Record<string, JsonSchemaDefinition>; // For objects
	required?: string[]; // For objects
	items?: JsonSchemaDefinition; // For arrays
	enum?: string[]; // For enums
	minimum?: number; // For numbers
	maximum?: number;
	default?: unknown; // Default values
	format?: string; // e.g., 'date-time', 'email', 'uri'
	examples?: unknown[]; // Example values
	title?: string; // Human-readable title
	minLength?: number; // For strings
	maxLength?: number; // For strings
	anyOf?: JsonSchemaDefinition[]; // For union types (e.g., string | null)
	oneOf?: JsonSchemaDefinition[]; // For one-of types
	allOf?: JsonSchemaDefinition[]; // For all-of types
}

// ===== Dynamic Schema Definition =====
// Wrapper around JSON Schema with metadata
export interface DynamicSchemaDefinition {
	id: string; // Unique identifier (e.g., "widget:paragraph-v1")
	name: string; // Human-readable name
	description?: string;

	// Storage: JSON Schema (standard format) - root must be type: 'object'
	jsonSchema: JsonSchemaDefinition;

	// Metadata
	version?: string;
	createdAt?: number;
	updatedAt?: number;
	source?: 'ui' | 'code' | 'ai'; // How was this schema created?
}

// ===== Data Envelope =====
// What flows through the ValidatedTopicStore
export interface Envelope<T = unknown> {
	topic: string;
	schemaId?: string; // If present, implies validation occurred
	timestamp: number;
	data: T;
}

// ===== Static System Types =====
export interface SystemAlert {
	level: 'info' | 'warning' | 'error';
	message: string;
	timestamp: number;
}
