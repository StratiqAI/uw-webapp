/**
 * Prompt Service Module
 *
 * Provides utilities for managing Prompt entities in the library,
 * including CRUD operations and data transformation between AIQueryData and
 * Prompt uses flat `prompt` / `systemInstruction` (API); references JsonSchema by jsonSchemaId.
 */

import type { Prompt, Project } from '@stratiqai/types-simple';
import { Q_GET_PROJECT_WITH_PROMPTS } from '@stratiqai/types-simple';
import {
	M_CREATE_PROMPT,
	M_DELETE_PROMPT,
	M_UPDATE_PROMPT,
	Q_LIST_PROMPTS
} from '$lib/services/graphql/promptOperations';
import { ensureEntityDefinition } from '$lib/services/graphql/entityDefinitionService';
import type { IGraphQLQueryClient } from '$lib/services/realtime/store/GraphQLQueryClient';

// Re-export shared types and utilities so existing consumers keep working
export type { AIQueryData } from '$lib/services/promptUtils';
export {
	getTemplateStrForEditor,
	parseTemplateToAIQueryData,
	serializeAIQueryDataToTemplate,
	extractPromptVariableNames
} from '$lib/services/promptUtils';

import type { AIQueryData } from '$lib/services/promptUtils';
import { extractPromptVariableNames } from '$lib/services/promptUtils';

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
 * Create a new prompt.
 * If jsonSchemaId is provided, it references an existing JsonSchema entity.
 * If schemaData is provided instead, an EntityDefinition is saved (which
 * auto-creates the linked JsonSchema via the backend pipeline).
 */
export async function createPromptTemplate(
	queryClient: IGraphQLQueryClient,
	projectId: string,
	name: string,
	aiQueryData: AIQueryData,
	description?: string,
	jsonSchemaId?: string,
	schemaData?: { name: string; description?: string; schemaDefinition: unknown }
): Promise<Prompt> {
	const variableNames = extractPromptVariableNames(aiQueryData.prompt);

	let resolvedJsonSchemaId = jsonSchemaId;
	if (!resolvedJsonSchemaId && schemaData && 'schemaDefinition' in schemaData) {
		const defResult = await ensureEntityDefinition(queryClient, projectId, {
			name: schemaData.name || name,
			description: schemaData.description,
			schemaDefinition: schemaData.schemaDefinition
		});
		resolvedJsonSchemaId = defResult.jsonSchemaId;
	}

	const input: Record<string, unknown> = {
		name,
		description: description || undefined,
		prompt: aiQueryData.prompt,
		systemInstruction: aiQueryData.systemPrompt ?? undefined,
		...(variableNames.length > 0 && { inputVariables: variableNames }),
		model: aiQueryData.model || 'GEMINI_2_5_FLASH',
		sharingMode: 'PRIVATE'
	};

	if (resolvedJsonSchemaId) {
		input.jsonSchemaId = resolvedJsonSchemaId;
	}

	const response = await queryClient.query<{
		createPrompt: Prompt;
	}>(M_CREATE_PROMPT, { input });

	if (!response?.createPrompt) {
		throw new Error('Failed to create prompt');
	}

	return response.createPrompt;
}

/**
 * Update an existing prompt.
 * Uses jsonSchemaId to reference JsonSchema entities.
 * If schemaData is provided and no jsonSchemaId, an EntityDefinition is
 * saved (which auto-creates the linked JsonSchema).
 */
export async function updatePromptTemplate(
	queryClient: IGraphQLQueryClient,
	id: string,
	updates: {
		name?: string;
		aiQueryData?: AIQueryData;
		description?: string;
		jsonSchemaId?: string;
		schemaData?: { name: string; description?: string; schemaDefinition: unknown };
		existingJsonSchemaId?: string;
	},
	projectId?: string
): Promise<Prompt> {
	const input: Record<string, unknown> = {};

	if (updates.name !== undefined) {
		input.name = updates.name;
	}
	if (updates.aiQueryData !== undefined) {
		const variableNames = extractPromptVariableNames(updates.aiQueryData.prompt);
		input.prompt = updates.aiQueryData.prompt;
		input.systemInstruction = updates.aiQueryData.systemPrompt ?? undefined;
		if (variableNames.length > 0) {
			input.inputVariables = variableNames;
		}
	}
	if (updates.description !== undefined) {
		input.description = updates.description;
	}
	if (updates.aiQueryData?.model !== undefined) {
		input.model = typeof updates.aiQueryData.model === 'string' ? updates.aiQueryData.model : String(updates.aiQueryData.model);
	}

	if (updates.jsonSchemaId) {
		input.jsonSchemaId = updates.jsonSchemaId;
	} else if (updates.schemaData && 'schemaDefinition' in updates.schemaData && projectId) {
		const defResult = await ensureEntityDefinition(
			queryClient,
			projectId,
			{
				name: updates.schemaData.name || (updates.name ?? 'Schema'),
				description: updates.schemaData.description,
				schemaDefinition: updates.schemaData.schemaDefinition
			}
		);
		input.jsonSchemaId = defResult.jsonSchemaId;
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
