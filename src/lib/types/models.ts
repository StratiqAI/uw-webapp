// 1. Recursive Field Definition for Runtime Schemas
export type FieldType = 'string' | 'number' | 'boolean' | 'date' | 'enum' | 'object' | 'array';

export interface FieldDefinition {
	name: string;
	type: FieldType;
	required: boolean;
	description?: string; // Context for external producers

	// Constraints for Primitives
	options?: string[]; // For 'enum'
	min?: number; // For 'number'
	max?: number;

	// Recursion for Complex Types
	// If type is 'object', subFields defines its shape.
	// If type is 'array' AND itemType is 'object', subFields defines the shape of array items.
	subFields?: FieldDefinition[];

	// If type is 'array', itemType defines what is inside.
	itemType?: FieldType;
}

export interface DynamicSchemaDefinition {
	id: string; // Unique UUID or slug (e.g., "cre:rent-roll-v1")
	name: string; // Human readable name
	fields: FieldDefinition[]; // Root is always an object containing these fields
}

// 2. The Data Envelope (What flows through the MapStore)
export interface Envelope<T = unknown> {
	topic: string;
	schemaId?: string; // If present, implies validation occurred
	timestamp: number;
	data: T;
}

// 3. Static System Types (Compile-time Guarantees)
export interface SystemAlert {
	level: 'info' | 'warning' | 'error';
	message: string;
	timestamp: number;
}

