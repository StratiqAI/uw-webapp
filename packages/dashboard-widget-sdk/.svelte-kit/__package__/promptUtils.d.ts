/**
 * Pure utility functions for prompt editing and JSON Schema manipulation.
 * Extracted from PromptEditModal.svelte so they can be reused in the SDK's
 * PromptEditor component and by host-app services.
 *
 * All functions are side-effect-free and operate on plain objects.
 */
import type { NestedItemSchema, NestedSchemaPropertyNode } from './promptSchemaTypes.js';
export declare const DEFAULT_AI_MODEL = "GEMINI_2_5_FLASH";
export declare const MODEL_OPTIONS: ReadonlyArray<{
    value: string;
    label: string;
}>;
export declare function normalizeToAIModel(value: string | undefined): string;
export declare function newNestedId(): string;
export declare function extractPromptVariables(text: string): {
    name: string;
    syntax: string;
}[];
export interface SchemaBuilderState {
    properties: Record<string, Record<string, unknown>>;
    fieldOrder: string[];
    required: string[];
}
/** Returns ordered entries: fieldOrder items first, then any remaining keys. */
export declare function getOrderedFieldEntries(properties: Record<string, Record<string, unknown>>, fieldOrder: string[]): Array<[string, Record<string, unknown>]>;
export declare function addSchemaField(state: SchemaBuilderState, isReasoning?: boolean): SchemaBuilderState;
export declare function removeSchemaField(state: SchemaBuilderState, fieldName: string): SchemaBuilderState;
export declare function updateSchemaField(properties: Record<string, Record<string, unknown>>, fieldName: string, updates: Record<string, unknown>): Record<string, Record<string, unknown>>;
export declare function updateSchemaFieldType(properties: Record<string, Record<string, unknown>>, fieldName: string, type: string): Record<string, Record<string, unknown>>;
export declare function toggleSchemaFieldRequired(required: string[], fieldName: string): string[];
export interface RenameResult {
    properties: Record<string, Record<string, unknown>>;
    fieldOrder: string[];
    required: string[];
    error?: string;
}
export declare function renameSchemaField(state: SchemaBuilderState, oldName: string, newName: string): RenameResult;
export declare function nestedNodeToJsonSchema(node: NestedSchemaPropertyNode): Record<string, unknown>;
export declare function nestedItemSchemaToJsonSchema(item: NestedItemSchema): Record<string, unknown>;
/** Convert a flat top-level field state (with objectChildren / itemSchema) to JSON Schema. */
export declare function topLevelFieldToJsonSchema(field: Record<string, unknown>): Record<string, unknown>;
/** Build the full JSON Schema preview object from the current field state. */
export declare function buildSchemaPreview(properties: Record<string, Record<string, unknown>>, required: string[]): Record<string, unknown>;
export declare function jsonSchemaToPropertyNode(id: string, name: string, def: Record<string, unknown>, required: boolean): NestedSchemaPropertyNode;
export declare function jsonSchemaToItemSchema(def: Record<string, unknown>): NestedItemSchema;
/** Convert a JSON Schema property definition into flat editor field state. */
export declare function flatFieldFromJsonSchemaFragment(def: Record<string, unknown>): Record<string, unknown>;
/**
 * Parse a full JSON Schema definition into SchemaBuilderState
 * (the inverse of buildSchemaPreview).
 */
export declare function parseJsonSchemaToBuilderState(schemaDefRaw: unknown): SchemaBuilderState;
