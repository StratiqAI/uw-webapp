/**
 * Library Service Module
 *
 * Provides utilities for managing Prompt entities (formerly PromptTemplate) in the library,
 * including CRUD operations and data transformation between AIQueryData and
 * the Prompt.templateText field (JSON string).
 */

import type { Prompt, Project } from '@stratiqai/types-simple';

/** Prompt type alias (API formerly PromptTemplate) */
type PromptTemplate = Prompt;
import {
	M_CREATE_PROMPT,
	M_UPDATE_PROMPT,
	M_DELETE_PROMPT,
	Q_GET_PROJECT_WITH_PROMPTS,
	Q_LIST_PROMPTS,
	Q_LIST_STRUCTURED_OUTPUT_SCHEMAS
} from '@stratiqai/types-simple';
import type { IGraphQLQueryClient } from '$lib/realtime/store/GraphQLQueryClient';

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
 * Parse the template JSON string to AIQueryData
 */
export function parseTemplateToAIQueryData(template: string): AIQueryData {
	try {
		const parsed = JSON.parse(template);
		return {
			prompt: parsed.prompt || '',
			model: parsed.model || 'gpt-4o',
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
			model: 'gpt-4o'
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
): Promise<{ project: Project; promptTemplates: PromptTemplate[] }> {
	const [projectResponse, promptsResponse] = await Promise.all([
		queryClient.query<{ getProject: Project | null }>(Q_GET_PROJECT_WITH_PROMPTS, {
			id: projectId
		}),
		queryClient.query<{ listPrompts: { items: PromptTemplate[] } }>(Q_LIST_PROMPTS, {
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
 * Resolve a default outputSchemaId by fetching the first structured output schema (required for createPrompt).
 */
async function getDefaultOutputSchemaId(
	queryClient: IGraphQLQueryClient
): Promise<string> {
	const response = await queryClient.query<{
		listStructuredOutputSchemas: { items: Array<{ id: string }> };
	}>(Q_LIST_STRUCTURED_OUTPUT_SCHEMAS, { limit: 1 });

	const items = response?.listStructuredOutputSchemas?.items ?? [];
	if (items.length === 0) {
		throw new Error(
			'No structured output schema found. Create one in AI Studio before creating prompts.'
		);
	}
	return items[0].id;
}

/**
 * Create a new prompt (formerly prompt template)
 */
export async function createPromptTemplate(
	queryClient: IGraphQLQueryClient,
	_parentId: string,
	name: string,
	aiQueryData: AIQueryData,
	description?: string
): Promise<PromptTemplate> {
	const templateText = serializeAIQueryDataToTemplate(aiQueryData);
	const outputSchemaId = await getDefaultOutputSchemaId(queryClient);

	const response = await queryClient.query<{
		createPrompt: PromptTemplate;
	}>(M_CREATE_PROMPT, {
		input: {
			name,
			description: description || undefined,
			templateText,
			outputSchemaId,
			sharingMode: 'PRIVATE'
		}
	});

	if (!response?.createPrompt) {
		throw new Error('Failed to create prompt');
	}

	return response.createPrompt;
}

/**
 * Update an existing prompt (parentId kept for API compatibility but not used)
 */
export async function updatePromptTemplate(
	queryClient: IGraphQLQueryClient,
	id: string,
	_parentId?: string,
	updates: {
		name?: string;
		aiQueryData?: AIQueryData;
		description?: string;
	}
): Promise<PromptTemplate> {
	const input: Record<string, unknown> = {};

	if (updates.name !== undefined) {
		input.name = updates.name;
	}
	if (updates.aiQueryData !== undefined) {
		input.templateText = serializeAIQueryDataToTemplate(updates.aiQueryData);
	}
	if (updates.description !== undefined) {
		input.description = updates.description;
	}

	const response = await queryClient.query<{
		updatePrompt: PromptTemplate;
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
): Promise<PromptTemplate> {
	const response = await queryClient.query<{
		deletePrompt: PromptTemplate;
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
