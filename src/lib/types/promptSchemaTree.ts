/** Shared tree types for Prompt "Answer format" editors (flat + nested modes). */

export type NestedSchemaNodeType = 'string' | 'number' | 'integer' | 'boolean' | 'object' | 'array';

export interface NestedItemSchema {
	type: NestedSchemaNodeType;
	description?: string;
	enum?: string[];
	minimum?: number;
	maximum?: number;
	properties?: NestedSchemaPropertyNode[];
	items?: NestedItemSchema;
}

export interface NestedSchemaPropertyNode {
	id: string;
	name: string;
	type: NestedSchemaNodeType;
	required: boolean;
	description: string;
	enum?: string[];
	minimum?: number;
	maximum?: number;
	children?: NestedSchemaPropertyNode[];
	itemSchema?: NestedItemSchema;
}
