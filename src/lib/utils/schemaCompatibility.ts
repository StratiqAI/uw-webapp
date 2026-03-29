/**
 * Schema Compatibility
 *
 * Strict compatibility check between two JSON Schemas drawn from the
 * ValidatedTopicStore catalog. "Strict" means both schemas must declare
 * exactly the same required keys and the same top-level property types.
 *
 * Used by the widget "Connect to AI output" dialog to warn users when
 * a data stream's schema does not match the widget's expected schema.
 */

import { validatedTopicStore } from '$lib/stores/validatedTopicStore';

export type CompatibilityResult =
	| { compatible: true }
	| { compatible: false; reason: string; missingKeys: string[]; extraKeys: string[] };

interface SchemaLike {
	type?: string | string[];
	properties?: Record<string, { type?: string | string[] }>;
	required?: string[];
}

function normalizeType(t: string | string[] | undefined): string {
	if (!t) return 'any';
	return Array.isArray(t) ? t.filter((x) => x !== 'null').sort().join('|') : t;
}

/**
 * Check whether `candidate` is compatible with `target`.
 *
 * Rule: every key in `target.required` must also be in `candidate.required`,
 * and each shared property's top-level type must match.
 *
 * Extra keys in the candidate (superset) are allowed and reported separately.
 */
export function checkSchemaCompatibility(
	targetSchemaId: string,
	candidateSchemaId: string
): CompatibilityResult {
	const targetSchema = validatedTopicStore.getJsonSchemaById(targetSchemaId) as SchemaLike | undefined;
	const candidateSchema = validatedTopicStore.getJsonSchemaById(candidateSchemaId) as SchemaLike | undefined;

	if (!targetSchema || !candidateSchema) {
		return {
			compatible: false,
			reason: !targetSchema
				? `Target schema "${targetSchemaId}" not found in catalog`
				: `Stream schema "${candidateSchemaId}" not found in catalog`,
			missingKeys: [],
			extraKeys: []
		};
	}

	const targetRequired = new Set(targetSchema.required ?? []);
	const candidateRequired = new Set(candidateSchema.required ?? []);
	const targetProps = targetSchema.properties ?? {};
	const candidateProps = candidateSchema.properties ?? {};

	// Required keys in target that are missing from candidate
	const missingKeys: string[] = [];
	for (const key of targetRequired) {
		if (!candidateRequired.has(key)) {
			missingKeys.push(key);
		}
	}

	// Type mismatches for keys that appear in both
	const typeMismatches: string[] = [];
	for (const key of targetRequired) {
		if (key in targetProps && key in candidateProps) {
			const targetType = normalizeType(targetProps[key]?.type);
			const candidateType = normalizeType(candidateProps[key]?.type);
			if (targetType !== 'any' && candidateType !== 'any' && targetType !== candidateType) {
				typeMismatches.push(`${key}: expected ${targetType}, got ${candidateType}`);
			}
		}
	}

	// Extra keys in candidate (informational — not a blocker)
	const extraKeys = [...candidateRequired].filter((k) => !targetRequired.has(k));

	if (missingKeys.length > 0 || typeMismatches.length > 0) {
		const parts: string[] = [];
		if (missingKeys.length > 0) {
			parts.push(`Missing required fields: ${missingKeys.join(', ')}`);
		}
		if (typeMismatches.length > 0) {
			parts.push(`Type mismatches: ${typeMismatches.join('; ')}`);
		}
		return {
			compatible: false,
			reason: parts.join('. '),
			missingKeys,
			extraKeys
		};
	}

	return { compatible: true };
}

/**
 * Convenience: check compatibility between a stream schema and a widget schema.
 * Returns true when every required field expected by the widget is present and
 * correctly typed in the stream schema.
 */
export function isSchemaCompatible(targetSchemaId: string, candidateSchemaId: string): boolean {
	return checkSchemaCompatibility(targetSchemaId, candidateSchemaId).compatible;
}
