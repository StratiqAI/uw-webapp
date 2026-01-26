/**
 * Library Service Module
 *
 * Provides utilities for managing PromptTemplate entities in the library,
 * including CRUD operations and data transformation between AIQueryData and
 * the PromptTemplate.template JSON field.
 */

import type { PromptTemplate, Project } from '@agnathan/types-simple';
import {
	M_CREATE_PROMPT_TEMPLATE,
	M_UPDATE_PROMPT_TEMPLATE,
	M_DELETE_PROMPT_TEMPLATE,
	Q_GET_PROJECT_WITH_PROMPT_TEMPLATES
} from '@agnathan/types-simple';
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
 * Response type for project with prompt templates
 */
export interface ProjectWithPromptTemplates extends Project {
	prompttemplates?: {
		items: PromptTemplate[];
		nextToken?: string | null;
	};
}

/**
 * Fetch a project with its prompt templates
 * This uses the nested query approach to get templates through the project entity
 */
export async function fetchProjectWithPromptTemplates(
	queryClient: IGraphQLQueryClient,
	projectId: string
): Promise<{ project: Project; promptTemplates: PromptTemplate[] }> {
	const response = await queryClient.query<{
		getProject: ProjectWithPromptTemplates | null;
	}>(Q_GET_PROJECT_WITH_PROMPT_TEMPLATES, { id: projectId });

	if (!response?.getProject) {
		throw new Error(`Project not found: ${projectId}`);
	}

	const project = response.getProject;
	const promptTemplates = project.prompttemplates?.items || [];

	return { project, promptTemplates };
}

/**
 * Create a new prompt template
 */
export async function createPromptTemplate(
	queryClient: IGraphQLQueryClient,
	parentId: string,
	name: string,
	aiQueryData: AIQueryData,
	description?: string
): Promise<PromptTemplate> {
	const template = serializeAIQueryDataToTemplate(aiQueryData);

	const response = await queryClient.query<{
		createPromptTemplate: PromptTemplate;
	}>(M_CREATE_PROMPT_TEMPLATE, {
		input: {
			parentId,
			name,
			template,
			description: description || undefined,
			sharingMode: 'PRIVATE'
		}
	});

	if (!response?.createPromptTemplate) {
		throw new Error('Failed to create prompt template');
	}

	return response.createPromptTemplate;
}

/**
 * Update an existing prompt template
 */
export async function updatePromptTemplate(
	queryClient: IGraphQLQueryClient,
	id: string,
	parentId: string,
	updates: {
		name?: string;
		aiQueryData?: AIQueryData;
		description?: string;
	}
): Promise<PromptTemplate> {
	const input: Record<string, any> = {};

	if (updates.name !== undefined) {
		input.name = updates.name;
	}
	if (updates.aiQueryData !== undefined) {
		input.template = serializeAIQueryDataToTemplate(updates.aiQueryData);
	}
	if (updates.description !== undefined) {
		input.description = updates.description;
	}

	const response = await queryClient.query<{
		updatePromptTemplate: PromptTemplate;
	}>(M_UPDATE_PROMPT_TEMPLATE, {
		key: { id, parentId },
		input
	});

	if (!response?.updatePromptTemplate) {
		throw new Error('Failed to update prompt template');
	}

	return response.updatePromptTemplate;
}

/**
 * Delete a prompt template
 */
export async function deletePromptTemplate(
	queryClient: IGraphQLQueryClient,
	id: string,
	parentId: string
): Promise<PromptTemplate> {
	const response = await queryClient.query<{
		deletePromptTemplate: PromptTemplate;
	}>(M_DELETE_PROMPT_TEMPLATE, {
		key: { id, parentId }
	});

	if (!response?.deletePromptTemplate) {
		throw new Error('Failed to delete prompt template');
	}

	return response.deletePromptTemplate;
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
