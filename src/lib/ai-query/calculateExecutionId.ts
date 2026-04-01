/**
 * Deterministic executionId (SHA-256 hex) matching
 * stratiqai-platform/scripts/aws/sqs-ai-queue-send.ts and backend aiQuerySubmit Lambda.
 * Uses Web Crypto for hashing (browser).
 */

function stableStringify(value: unknown): string {
	if (value === null || typeof value !== 'object') {
		return JSON.stringify(value);
	}
	if (Array.isArray(value)) {
		return `[${value.map(stableStringify).join(',')}]`;
	}
	const o = value as Record<string, unknown>;
	const keys = Object.keys(o).sort();
	return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(o[k])}`).join(',')}}`;
}

function canonicalInputValuesString(s: string): string {
	const t = s.trim();
	if (t === '') return '';
	try {
		return stableStringify(JSON.parse(t) as unknown);
	} catch {
		return t;
	}
}

async function sha256HexUtf8(text: string): Promise<string> {
	const data = new TextEncoder().encode(text);
	const digest = await crypto.subtle.digest('SHA-256', data);
	return Array.from(new Uint8Array(digest))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}

/**
 * Same inputs as Lambda after normalizeInputValues: `inputValues` is always the string form.
 */
export async function calculateExecutionId(params: {
	projectId: string;
	documentIds: readonly string[];
	promptId: string;
	inputValues: string | Record<string, unknown>;
	jsonSchemaId?: string | null;
	model?: string | null;
}): Promise<string> {
	const { projectId, documentIds, promptId, inputValues, jsonSchemaId, model } = params;
	const sortedDocIds = [...documentIds].map(String).sort();
	const inputValuesCanonical =
		typeof inputValues === 'string'
			? canonicalInputValuesString(inputValues)
			: stableStringify(inputValues);

	const payload = stableStringify({
		projectId: String(projectId),
		documentIds: sortedDocIds,
		promptId: String(promptId),
		inputValues: inputValuesCanonical,
		jsonSchemaId: String(jsonSchemaId ?? ''),
		model: String(model ?? '')
	});

	return sha256HexUtf8(payload);
}

/** Mirrors aiQuerySubmit `normalizeInputValues`. */
export function normalizeInputValuesForExecutionId(inputValues: unknown): string {
	if (typeof inputValues === 'string') return inputValues;
	return JSON.stringify(inputValues ?? {});
}

/** Mirrors aiQuerySubmit `normalizeDocumentIds`. */
export function normalizeDocumentIdsForExecutionId(
	ids: readonly (string | null | undefined)[] | undefined
): string[] {
	if (!ids?.length) return [];
	return ids.filter((x) => x != null && String(x).length > 0).map(String);
}

/**
 * Compute the executionId AppSync will use for submitAIQuery with the same input object
 * you send in the mutation (after Lambda normalization).
 */
export async function computeExecutionIdForSubmitInput(input: {
	projectId: string;
	promptId: string;
	inputValues: unknown;
	documentIds?: readonly (string | null | undefined)[] | undefined;
	jsonSchemaId?: string | null;
	model?: string | null;
}): Promise<string> {
	const inputValuesStr = normalizeInputValuesForExecutionId(input.inputValues);
	const documentIds = normalizeDocumentIdsForExecutionId(input.documentIds);
	return calculateExecutionId({
		projectId: input.projectId,
		documentIds,
		promptId: input.promptId,
		inputValues: inputValuesStr,
		jsonSchemaId: input.jsonSchemaId,
		model: input.model
	});
}
