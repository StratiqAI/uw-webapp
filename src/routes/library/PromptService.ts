/**
 * Prompt Service Module
 *
 * Provides utilities for managing Prompt entities in the library,
 * including CRUD operations and data transformation between AIQueryData and
 * Prompt.content (body, systemInstruction). Uses inline outputSchema (PromptOutputSchema).
 */

import type { Prompt, Project, PromptOutputSchemaInput } from '@stratiqai/types-simple';
import {
	M_CREATE_PROMPT,
	M_UPDATE_PROMPT,
	M_DELETE_PROMPT,
	Q_GET_PROJECT_WITH_PROMPTS,
	Q_LIST_PROMPTS
} from '@stratiqai/types-simple';
import type { IGraphQLQueryClient } from '$lib/realtime/store/GraphQLQueryClient';

/** Default inline output schema when creating a prompt without a user-provided schema */
const DEFAULT_OUTPUT_SCHEMA: PromptOutputSchemaInput = {
	name: 'Default',
	description: undefined,
	schemaDefinition: { type: 'object', properties: {} }
};

/**
 * AppSync AWSJSON expects JSON as a string. Normalize outputSchema for API (create/update).
 */
function outputSchemaForApi(schema: PromptOutputSchemaInput): {
	name: string;
	description?: string;
	schemaDefinition: string;
} {
	return {
		name: schema.name ?? 'Structured output',
		description: schema.description ?? undefined,
		schemaDefinition:
			typeof schema.schemaDefinition === 'string'
				? schema.schemaDefinition
				: JSON.stringify(schema.schemaDefinition ?? { type: 'object', properties: {} })
	};
}

/**
 * AIQueryData interface - matches the workflow editor's data structure
 */
export interface AIQueryData {
	prompt: string;
	model: string;
	systemPrompt?: string;
	temperature?: number;
	maxTokens?: number;
	topP?: number;
	frequencyPenalty?: number;
	presencePenalty?: number;
	stop?: string | string[];
	responseFormat?: {
		type: 'text' | 'json_object' | 'json_schema';
		schema?: Record<string, any>;
	};
	stream?: boolean;
	user?: string;
	seed?: number;
	logitBias?: Record<string, number>;
	metadata?: Record<string, any>;
}

/**
 * Get a string from a Prompt suitable for the editor (parseable by parseTemplateToAIQueryData).
 * Uses content.body and content.systemInstruction; compatible with legacy JSON template shape.
 */
export function getTemplateStrForEditor(prompt: Prompt): string {
	const body = prompt.content?.body ?? '';
	const systemInstruction = prompt.content?.systemInstruction ?? '';
	const model = (prompt as { model?: string }).model ?? 'GEMINI_2_5_FLASH';
	return serializeAIQueryDataToTemplate({ prompt: body, systemPrompt: systemInstruction, model });
}

/**
 * Parse the template JSON string to AIQueryData
 */
export function parseTemplateToAIQueryData(template: string): AIQueryData {
	try {
		const parsed = JSON.parse(template);
		return {
			prompt: parsed.prompt || '',
			model: parsed.model || 'GEMINI_2_5_FLASH',
			systemPrompt: parsed.systemPrompt,
			temperature: parsed.temperature,
			maxTokens: parsed.maxTokens,
			topP: parsed.topP,
			frequencyPenalty: parsed.frequencyPenalty,
			presencePenalty: parsed.presencePenalty,
			stop: parsed.stop,
			responseFormat: parsed.responseFormat,
			stream: parsed.stream,
			user: parsed.user,
			seed: parsed.seed,
			logitBias: parsed.logitBias,
			metadata: parsed.metadata
		};
	} catch {
		// Return default if parsing fails
		return {
			prompt: template || '',
			model: 'GEMINI_2_5_FLASH'
		};
	}
}

/**
 * Serialize AIQueryData to JSON string for storage
 */
export function serializeAIQueryDataToTemplate(data: AIQueryData): string {
	// Remove undefined values before serializing
	const cleanData: Record<string, any> = {
		prompt: data.prompt,
		model: data.model
	};

	if (data.systemPrompt) cleanData.systemPrompt = data.systemPrompt;
	if (data.temperature !== undefined) cleanData.temperature = data.temperature;
	if (data.maxTokens !== undefined) cleanData.maxTokens = data.maxTokens;
	if (data.topP !== undefined) cleanData.topP = data.topP;
	if (data.frequencyPenalty !== undefined) cleanData.frequencyPenalty = data.frequencyPenalty;
	if (data.presencePenalty !== undefined) cleanData.presencePenalty = data.presencePenalty;
	if (data.stop) cleanData.stop = data.stop;
	if (data.responseFormat) cleanData.responseFormat = data.responseFormat;
	if (data.stream) cleanData.stream = data.stream;
	if (data.user) cleanData.user = data.user;
	if (data.seed !== undefined) cleanData.seed = data.seed;
	if (data.logitBias) cleanData.logitBias = data.logitBias;
	if (data.metadata) cleanData.metadata = data.metadata;

	return JSON.stringify(cleanData);
}

/**
 * Fetch a project and owned prompts (prompts are no longer nested under project)
 */
export async function fetchProjectWithPromptTemplates(
	queryClient: IGraphQLQueryClient,
	projectId: string
): Promise<{ project: Project; promptTemplates: Prompt[] }> {
	const [projectResponse, promptsResponse] = await Promise.all([
		queryClient.query<{ getProject: Project | null }>(Q_GET_PROJECT_WITH_PROMPTS, {
			id: projectId
		}),
		queryClient.query<{ listPrompts: { items: Prompt[] } }>(Q_LIST_PROMPTS, {
			scope: 'OWNED_BY_ME',
			limit: 200
		})
	]);

	if (!projectResponse?.getProject) {
		throw new Error(`Project not found: ${projectId}`);
	}

	const project = projectResponse.getProject;
	const promptTemplates = promptsResponse?.listPrompts?.items ?? [];

	return { project, promptTemplates };
}

/**
 * Create a new prompt
 */
export async function createPromptTemplate(
	queryClient: IGraphQLQueryClient,
	_parentId: string,
	name: string,
	aiQueryData: AIQueryData,
	description?: string,
	outputSchema?: PromptOutputSchemaInput
): Promise<Prompt> {
	const variableNames = extractPromptVariableNames(aiQueryData.prompt);
	const content = {
		body: aiQueryData.prompt,
		systemInstruction: aiQueryData.systemPrompt ?? undefined,
		...(variableNames.length > 0 && { inputVariables: variableNames })
	};
	const schema = outputSchema ?? DEFAULT_OUTPUT_SCHEMA;

	const response = await queryClient.query<{
		createPrompt: Prompt;
	}>(M_CREATE_PROMPT, {
		input: {
			name,
			description: description || undefined,
			content,
			model: aiQueryData.model || 'GEMINI_2_5_FLASH',
			outputSchema: outputSchemaForApi(schema),
			sharingMode: 'PRIVATE'
		}
	});

	if (!response?.createPrompt) {
		throw new Error('Failed to create prompt');
	}

	return response.createPrompt;
}

/**
 * Extract unique variable names from prompt text in order of first occurrence.
 * Supports {{name}} and {name} (single-brace) placeholders.
 */
export function extractPromptVariableNames(text: string): string[] {
	if (!text?.trim()) return [];
	const seen = new Set<string>();
	const result: string[] = [];
	const doubleRegex = /\{\{([^}]+)\}\}/g;
	const singleRegex = /\{([^{}]+)\}/g;
	let m: RegExpExecArray | null;
	while ((m = doubleRegex.exec(text)) !== null) {
		const name = m[1].trim();
		if (name && !seen.has(name)) {
			seen.add(name);
			result.push(name);
		}
	}
	while ((m = singleRegex.exec(text)) !== null) {
		const name = m[1].trim();
		if (name && !seen.has(name)) {
			seen.add(name);
			result.push(name);
		}
	}
	return result;
}

/**
 * Update an existing prompt (parentId kept for API compatibility but not used)
 */
export async function updatePromptTemplate(
	queryClient: IGraphQLQueryClient,
	id: string,
	updates: {
		name?: string;
		aiQueryData?: AIQueryData;
		description?: string;
		outputSchema?: PromptOutputSchemaInput;
	},
	_parentId?: string
): Promise<Prompt> {
	const input: Record<string, unknown> = {};

	if (updates.name !== undefined) {
		input.name = updates.name;
	}
	if (updates.aiQueryData !== undefined) {
		const variableNames = extractPromptVariableNames(updates.aiQueryData.prompt);
		input.content = {
			body: updates.aiQueryData.prompt,
			systemInstruction: updates.aiQueryData.systemPrompt ?? undefined,
			...(variableNames.length > 0 && { inputVariables: variableNames })
		};
	}
	if (updates.description !== undefined) {
		input.description = updates.description;
	}
	if (updates.aiQueryData?.model !== undefined) {
		// Send as string so GraphQL receives the enum value (e.g. GEMINI_3_1_PRO_PREVIEW)
		input.model = typeof updates.aiQueryData.model === 'string' ? updates.aiQueryData.model : String(updates.aiQueryData.model);
	}
	if (updates.outputSchema !== undefined) {
		input.outputSchema = outputSchemaForApi(updates.outputSchema);
	}

	const response = await queryClient.query<{
		updatePrompt: Prompt;
	}>(M_UPDATE_PROMPT, {
		id,
		input
	});

	if (!response?.updatePrompt) {
		throw new Error('Failed to update prompt');
	}

	return response.updatePrompt;
}

/**
 * Delete a prompt (parentId kept for API compatibility but not used)
 */
export async function deletePromptTemplate(
	queryClient: IGraphQLQueryClient,
	id: string,
	_parentId?: string
): Promise<Prompt> {
	const response = await queryClient.query<{
		deletePrompt: Prompt;
	}>(M_DELETE_PROMPT, {
		id
	});

	if (!response?.deletePrompt) {
		throw new Error('Failed to delete prompt');
	}

	return response.deletePrompt;
}

/**
 * Default AIQueryData for new templates
 */
export function getDefaultAIQueryData(): AIQueryData {
	return {
		prompt: 'Analyze the following data and provide insights: {input}',
		model: 'gpt-4o',
		systemPrompt: 'You are a helpful AI assistant.'
	};
}
