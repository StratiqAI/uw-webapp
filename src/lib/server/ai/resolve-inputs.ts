/**
 * Resolve prompt, schema, model, and vision-rag routing for streaming (AppSync via user JWT).
 */

import { gql } from '$lib/services/realtime/graphql/requestHandler';
import type { Prompt } from '@stratiqai/types-simple';
import { Q_GET_PROMPT, Q_GET_JSON_SCHEMA } from '@stratiqai/types-simple';
import { env } from '$env/dynamic/private';
import { getGeminiClient, getGcpProjectAndLocation, resolveModelId } from './gemini-client.js';
import type { ResolveStreamResult, StreamRequestBody, VisionRagBlock } from './types.js';
import { ErrorCode } from './utils.js';

function resolveSchemaRef(schema: Record<string, unknown>): Record<string, unknown> {
	const ref = schema.$ref;
	const definitions = schema.definitions as Record<string, Record<string, unknown>> | undefined;
	if (typeof ref === 'string' && definitions) {
		const refPath = ref.replace(/^#\/definitions\//, '');
		const resolved = definitions[refPath];
		if (resolved && typeof resolved === 'object') {
			const { $schema: _, definitions: __, ...rest } = schema;
			return {
				...resolved,
				...Object.fromEntries(Object.entries(rest).filter(([k]) => k !== '$ref'))
			};
		}
	}
	const { $schema: _, ...withoutMeta } = schema;
	return withoutMeta;
}

async function fetchSchemaDefinition(
	schemaId: string,
	idToken: string
): Promise<Record<string, unknown> | null> {
	const result = await gql<{ getJsonSchema?: { schemaDefinition?: string } | null }>(
		Q_GET_JSON_SCHEMA,
		{ id: schemaId },
		idToken
	);
	const raw = result.getJsonSchema?.schemaDefinition;
	if (!raw) return null;
	try {
		const parsed =
			typeof raw === 'string' ? (JSON.parse(raw) as Record<string, unknown>) : (raw as Record<string, unknown>);
		return resolveSchemaRef(parsed);
	} catch {
		return null;
	}
}

function hasVisionRagConfig(): boolean {
	const project = env.GOOGLE_PROJECT_ID ?? env.GOOGLE_CLOUD_PROJECT ?? '';
	const pineconeKey = env.PINECONE_API_KEY ?? '';
	const index = env.PINECONE_INDEX ?? env.PINECONE_INDEX_NAME ?? '';
	return !!(project && pineconeKey && index);
}

function missingVisionRagVars(): string[] {
	const project = env.GOOGLE_PROJECT_ID ?? env.GOOGLE_CLOUD_PROJECT ?? '';
	const pineconeKey = env.PINECONE_API_KEY ?? '';
	const index = env.PINECONE_INDEX ?? env.PINECONE_INDEX_NAME ?? '';
	return [
		project ? null : 'GOOGLE_PROJECT_ID',
		pineconeKey ? null : 'PINECONE_API_KEY',
		index ? null : 'PINECONE_INDEX'
	].filter((v): v is string => v != null);
}

export interface ResolveStreamOptions {
	/** When true, never enable vision RAG (AI Studio text-only path). */
	disableVisionRag?: boolean;
}

/**
 * Resolve all inputs needed to run streaming generation.
 */
export async function resolveStreamInputs(
	body: StreamRequestBody,
	documentIdsFromRequest: string[],
	idToken: string,
	options?: ResolveStreamOptions
): Promise<ResolveStreamResult> {
	const getPromptResult = await gql<{ getPrompt: Prompt | null }>(
		Q_GET_PROMPT,
		{ id: body.promptId },
		idToken
	);
	const prompt = getPromptResult?.getPrompt as
		| Pick<Prompt, 'prompt' | 'inputVariables' | 'model' | 'jsonSchemaId'>
		| null;

	if (!prompt?.prompt) {
		return {
			kind: 'error',
			errorCode: ErrorCode.PROMPT_NOT_FOUND,
			errorMessage: 'Prompt not found or has no prompt text'
		};
	}

	let client;
	let modelId: string;
	try {
		client = getGeminiClient();
		modelId = resolveModelId(typeof prompt.model === 'string' ? prompt.model : undefined);
	} catch (err) {
		return {
			kind: 'error',
			errorCode: ErrorCode.API_KEY_MISSING,
			errorMessage: err instanceof Error ? err.message : String(err)
		};
	}

	const schemaDefinition = prompt.jsonSchemaId
		? await fetchSchemaDefinition(prompt.jsonSchemaId, idToken)
		: null;

	let variables: Record<string, unknown> = {};
	try {
		variables =
			typeof body.inputValues === 'object' && body.inputValues !== null && !Array.isArray(body.inputValues)
				? body.inputValues
				: {};
	} catch {
		variables = {};
	}

	const question =
		(variables.question as string | undefined) ??
		(variables.text as string | undefined) ??
		(variables.prompt as string | undefined) ??
		prompt.prompt;

	const bodyDocIds = documentIdsFromRequest.filter((id): id is string => id != null && id !== '');
	const documentIds: string[] =
		bodyDocIds.length > 0
			? bodyDocIds
			: ((variables.documentIds as string[] | undefined) ?? []).filter(Boolean);

	const useVisionRag =
		!options?.disableVisionRag && Boolean(question?.trim() && documentIds.length > 0);

	let visionRag: VisionRagBlock | null = null;
	if (useVisionRag) {
		if (!hasVisionRagConfig()) {
			return {
				kind: 'error',
				errorCode: ErrorCode.VISION_CONFIG_MISSING,
				errorMessage: `Vision RAG requires: ${missingVisionRagVars().join(', ')}`
			};
		}
		const { projectId, location } = getGcpProjectAndLocation();
		visionRag = {
			question: question!.trim(),
			documentIds,
			visionConfig: {
				projectId,
				location,
				pineconeApiKey: env.PINECONE_API_KEY!,
				pineconeIndexName: env.PINECONE_INDEX ?? env.PINECONE_INDEX_NAME!
			},
			topK: body.topK ?? (variables.topK as number | undefined) ?? 5,
			topKPerNs: body.topKPerNs ?? (variables.topKPerNs as number | undefined) ?? 5,
			googleSearchEnabled: body.googleSearchEnabled !== false
		};
	}

	return {
		kind: 'resolved',
		data: {
			client,
			modelId,
			schemaDefinition,
			variables,
			visionRag,
			promptText: prompt.prompt,
			prompt
		}
	};
}
