/**
 * @deprecated Use Extraction-based data flow instead. Extraction records store
 * structured AI output as plain JSON, eliminating the need for EAV translation
 * and structural-hash-based topic routing. Kept for backward compatibility with
 * the Ontology Explorer page.
 *
 * Pure helper functions for the Ontology-to-Svelte bridge.
 */

import type {
	EntityInstance,
	PropertyValue,
	PropertyDefinition,
	PropertyValueInput,
	PropertyDataType,
} from '@stratiqai/types-simple';

// ---------------------------------------------------------------------------
// Topic path builders (keyed by structuralHash, not definitionId)
// ---------------------------------------------------------------------------

export function toOntologyDefTopic(projectId: string, structuralHash: string): string {
	return `ontology/p/${projectId}/schema/${structuralHash}`;
}

export function toOntologyInstDataTopic(
	projectId: string,
	structuralHash: string,
	instanceId: string,
): string {
	return `ontology/p/${projectId}/schema/${structuralHash}/inst/${instanceId}/data`;
}

export function toOntologyInstMetaTopic(
	projectId: string,
	structuralHash: string,
	instanceId: string,
): string {
	return `ontology/p/${projectId}/schema/${structuralHash}/inst/${instanceId}/meta`;
}

/**
 * VTS schema pattern that matches all instance-data topics for a given
 * structuralHash, regardless of projectId or instanceId.
 */
export function buildOntologySchemaPattern(structuralHash: string): string {
	return `ontology/p/+/schema/${structuralHash}/inst/+/data`;
}

// ---------------------------------------------------------------------------
// EAV ↔ flat-map translation
// ---------------------------------------------------------------------------

const TYPED_VALUE_KEYS = ['stringValue', 'numberValue', 'booleanValue', 'dateValue'] as const;

/**
 * Convert a GraphQL `PropertyValue[]` array into a flat
 * `Record<string, unknown>` by picking the first non-null typed value.
 */
export function eavToFlatMap(
	values: Array<PropertyValue | null> | null | undefined,
): Record<string, unknown> {
	const flat: Record<string, unknown> = {};
	if (!values) return flat;

	for (const pv of values) {
		if (!pv) continue;
		for (const key of TYPED_VALUE_KEYS) {
			const v = pv[key];
			if (v !== null && v !== undefined) {
				flat[pv.propertyName] = v;
				break;
			}
		}
	}
	return flat;
}

const DATA_TYPE_TO_VALUE_KEY: Record<PropertyDataType, keyof PropertyValueInput> = {
	STRING: 'stringValue',
	NUMBER: 'numberValue',
	BOOLEAN: 'booleanValue',
	DATE: 'dateValue',
	CALCULATION: 'stringValue',
};

/**
 * Reverse of `eavToFlatMap`: given a flat key-value map and the definition's
 * property list (for data-type info), produce `PropertyValueInput[]`.
 */
export function flatMapToEav(
	flat: Record<string, unknown>,
	properties: Array<PropertyDefinition | null> | null | undefined,
): PropertyValueInput[] {
	if (!properties) return [];

	const inputs: PropertyValueInput[] = [];
	for (const prop of properties) {
		if (!prop) continue;
		const rawValue = flat[prop.name];
		if (rawValue === undefined) continue;

		const valueKey = DATA_TYPE_TO_VALUE_KEY[prop.dataType] ?? 'stringValue';
		inputs.push({
			propertyName: prop.name,
			[valueKey]: rawValue,
		} as PropertyValueInput);
	}
	return inputs;
}

/**
 * Lightweight reverse of `eavToFlatMap` that infers value slots from JS types.
 * Useful when property definitions are unavailable (e.g. converting AI output
 * to `PropertyValueInput[]`).
 */
export function flatToPropertyValues(
	flat: Record<string, unknown>,
): PropertyValueInput[] {
	return Object.entries(flat)
		.filter(([, v]) => v !== undefined && v !== null)
		.map(([key, value]) => {
			if (typeof value === 'number')
				return { propertyName: key, numberValue: value } as PropertyValueInput;
			if (typeof value === 'boolean')
				return { propertyName: key, booleanValue: value } as PropertyValueInput;
			return { propertyName: key, stringValue: String(value) } as PropertyValueInput;
		});
}

/**
 * Convenience: extract the flat data map from an EntityInstance.
 * This is what gets published to VTS at the instance data topic.
 */
export function extractInstanceData(instance: EntityInstance): Record<string, unknown> {
	return eavToFlatMap(instance.values as Array<PropertyValue | null> | null | undefined);
}

export interface InstanceMeta {
	label: string | null;
	updatedAt: string | null;
}

/**
 * Extract metadata (label, updatedAt) from an EntityInstance.
 * Published to a sibling VTS topic so the UI can display/edit label.
 */
export function extractInstanceMeta(instance: EntityInstance): InstanceMeta {
	return {
		label: instance.label ?? null,
		updatedAt: instance.updatedAt ?? null,
	};
}

// ---------------------------------------------------------------------------
// Schema compatibility heuristic (for widget matchmaking)
// ---------------------------------------------------------------------------

interface JsonSchemaObject {
	type?: string;
	properties?: Record<string, { type?: string; [k: string]: unknown }>;
	required?: string[];
	[k: string]: unknown;
}

/**
 * Returns true when `entitySchema` can satisfy `widgetSchema`.
 *
 * Heuristic: every *required* property of the widget schema must exist in the
 * entity schema with a compatible primitive type. If the widget has no
 * `required` array, all its `properties` keys are treated as required.
 */
export function isSchemaCompatible(
	entitySchema: JsonSchemaObject,
	widgetSchema: JsonSchemaObject,
): boolean {
	const entityProps = entitySchema.properties ?? {};
	const widgetProps = widgetSchema.properties ?? {};

	const requiredKeys =
		widgetSchema.required ??
		Object.keys(widgetProps);

	if (requiredKeys.length === 0) return false;

	for (const key of requiredKeys) {
		const entityProp = entityProps[key];
		if (!entityProp) return false;

		const widgetProp = widgetProps[key];
		if (widgetProp?.type && entityProp.type && widgetProp.type !== entityProp.type) {
			return false;
		}
	}
	return true;
}
