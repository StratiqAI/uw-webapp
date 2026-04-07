/**
 * Widget Prompt Service
 *
 * Manages the two-tier Prompt/EntityDefinition entity lifecycle for AI-enabled widgets:
 *   Tier 1 — Kind-level templates (created once at app startup per widget kind)
 *   Tier 2 — Per-instance entities (cloned from templates when a widget first uses AI)
 *
 * Also provides prompt discovery (listCompatiblePrompts) for the PromptChooser UI.
 */

import type { Prompt } from '@stratiqai/types-simple';
import type { WidgetPromptConfig } from '@stratiqai/dashboard-widget-sdk';
import { zodToJsonSchema } from 'zod-to-json-schema';
import {
	getRegisteredManifests,
	getWidgetPromptConfig
} from '$lib/dashboard/setup/widgetRegistry';
import { ensureEntityDefinition } from '$lib/services/graphql/entityDefinitionService';
import {
	Q_GET_PROMPT,
	Q_LIST_PROMPTS,
	M_CREATE_PROMPT,
	M_UPDATE_PROMPT
} from '$lib/services/graphql/promptOperations';
import {
	Q_LIST_ENTITY_DEFINITIONS,
	Q_GET_ENTITY_DEFINITION
} from '$lib/services/graphql/entityDefinitionOperations';
import type { IGraphQLQueryClient } from '$lib/services/realtime/store/GraphQLQueryClient';
import { extractPromptVariables } from '@stratiqai/dashboard-widget-sdk';
import { createLogger } from '$lib/utils/logger';

const log = createLogger('widget-prompt-svc');

// ---------------------------------------------------------------------------
// Template cache (in-memory, per session)
// ---------------------------------------------------------------------------

interface TemplateCache {
	templatePromptId: string;
	templateEntityDefinitionId: string;
}

const templateCache = new Map<string, TemplateCache>();

// ---------------------------------------------------------------------------
// Tier 1: Kind-level template sync (app startup)
// ---------------------------------------------------------------------------

/**
 * Ensure all registered widget kinds with promptConfig have
 * template Prompt + EntityDefinition entities in the cloud.
 * Called once from +layout.svelte onMount.
 */
export async function syncWidgetTemplates(queryClient: IGraphQLQueryClient): Promise<void> {
	const manifests = getRegisteredManifests();
	const withPrompt = manifests.filter((m) => m.promptConfig);
	if (withPrompt.length === 0) return;

	await Promise.allSettled(
		withPrompt.map(async (m) => {
			try {
				await ensureWidgetTemplate(m.kind, m.promptConfig!, queryClient);
			} catch (err) {
				log.error(`Failed to sync template for widget kind "${m.kind}":`, err);
			}
		})
	);
}

async function ensureWidgetTemplate(
	kind: string,
	promptConfig: WidgetPromptConfig,
	queryClient: IGraphQLQueryClient
): Promise<TemplateCache> {
	const cached = templateCache.get(kind);
	if (cached) return cached;

	const templateSchemaName = `widget-template:${kind}:output`;
	const templatePromptName = `widget-template:${kind}`;

	const jsonSchema = zodToJsonSchema(promptConfig.aiOutputSchema, {
		name: templateSchemaName,
		$refStrategy: 'none'
	});
	const schemaDef = (jsonSchema as Record<string, unknown>).definitions
		? ((jsonSchema as Record<string, unknown>).definitions as Record<string, unknown>)[templateSchemaName] ?? jsonSchema
		: jsonSchema;

	// Check if template prompt already exists
	const existing = await findPromptByName(queryClient, templatePromptName);
	if (existing) {
		const entry: TemplateCache = {
			templatePromptId: existing.id,
			templateEntityDefinitionId: (existing as unknown as Record<string, string>).entityDefinitionId ?? ''
		};
		templateCache.set(kind, entry);
		return entry;
	}

	const templateEntityDefinitionId = await ensureEntityDefinition(queryClient, {
		name: templateSchemaName,
		description: `Default output schema for ${kind} widgets`,
		schemaDefinition: schemaDef
	});

	// Create template Prompt
	const variableNames = extractPromptVariables(promptConfig.defaultPrompt).map((v) => v.name);

	const promptInput: Record<string, unknown> = {
		name: templatePromptName,
		description: `Default prompt template for ${kind} widgets`,
		prompt: promptConfig.defaultPrompt,
		systemInstruction: promptConfig.systemInstruction ?? undefined,
		model: promptConfig.model ?? 'GEMINI_2_5_FLASH',
		entityDefinitionId: templateEntityDefinitionId,
		sharingMode: 'PRIVATE',
		...(variableNames.length > 0 && { inputVariables: variableNames })
	};

	const result = await queryClient.query<{ createPrompt: Prompt }>(
		M_CREATE_PROMPT,
		{ input: promptInput }
	);

	if (!result?.createPrompt?.id) {
		throw new Error(`Failed to create template prompt for widget kind "${kind}"`);
	}

	const entry: TemplateCache = {
		templatePromptId: result.createPrompt.id,
		templateEntityDefinitionId
	};
	templateCache.set(kind, entry);
	return entry;
}

// ---------------------------------------------------------------------------
// Tier 2: Per-instance entities
// ---------------------------------------------------------------------------

export interface WidgetInstancePrompt {
	promptId: string;
	entityDefinitionId: string;
}

/**
 * Ensure a widget instance has its own Prompt + EntityDefinition entities.
 * If existingPromptId is provided and valid, returns it.
 * Otherwise clones from the kind-level template.
 */
export async function ensureWidgetInstancePrompt(
	kind: string,
	widgetId: string,
	widgetTitle: string | undefined,
	widgetDescription: string | undefined,
	existingPromptId: string | undefined,
	queryClient: IGraphQLQueryClient
): Promise<WidgetInstancePrompt> {
	if (existingPromptId) {
		try {
			const existing = await queryClient.query<{ getPrompt: Prompt | null }>(
				Q_GET_PROMPT,
				{ id: existingPromptId }
			);
			if (existing?.getPrompt) {
			return {
				promptId: existing.getPrompt.id,
				entityDefinitionId: (existing.getPrompt as unknown as Record<string, string>).entityDefinitionId ?? ''
			};
			}
		} catch {
			log.warn(`Instance prompt ${existingPromptId} not found, creating new one`);
		}
	}

	const promptConfig = getWidgetPromptConfig(kind);
	if (!promptConfig) {
		throw new Error(`Widget kind "${kind}" has no promptConfig`);
	}

	const template = await ensureWidgetTemplate(kind, promptConfig, queryClient);

	const instanceSchemaName = widgetTitle
		? `${widgetTitle} Output`
		: `widget:${kind}:${widgetId}:output`;

	let templateSchemaDef: unknown;
	try {
		const schemaResult = await queryClient.query<{
			getEntityDefinition: { schemaDefinition: string } | null;
		}>(Q_GET_ENTITY_DEFINITION, { id: template.templateEntityDefinitionId });
		templateSchemaDef = schemaResult?.getEntityDefinition?.schemaDefinition
			? JSON.parse(schemaResult.getEntityDefinition.schemaDefinition)
			: undefined;
	} catch {
		log.warn('Could not fetch template schema definition, using manifest schema');
	}

	if (!templateSchemaDef) {
		const jsonSchema = zodToJsonSchema(promptConfig.aiOutputSchema, {
			name: `widget-template:${kind}:output`,
			$refStrategy: 'none'
		});
		templateSchemaDef = jsonSchema;
	}

	const instanceEntityDefinitionId = await ensureEntityDefinition(queryClient, {
		name: instanceSchemaName,
		description: widgetDescription || `Output schema for ${kind} widget ${widgetId}`,
		schemaDefinition: templateSchemaDef
	});

	// Clone template Prompt for this instance
	let templatePrompt: Prompt | null = null;
	try {
		const promptResult = await queryClient.query<{ getPrompt: Prompt | null }>(
			Q_GET_PROMPT,
			{ id: template.templatePromptId }
		);
		templatePrompt = promptResult?.getPrompt ?? null;
	} catch {
		log.warn('Could not fetch template prompt, using manifest defaults');
	}

	const instancePromptName = widgetTitle || `widget:${kind}:${widgetId}`;
	const promptText = templatePrompt?.prompt ?? promptConfig.defaultPrompt;
	const variableNames = extractPromptVariables(promptText).map((v) => v.name);

	const instanceInput: Record<string, unknown> = {
		name: instancePromptName,
		description: widgetDescription || templatePrompt?.description || undefined,
		prompt: promptText,
		systemInstruction:
			templatePrompt?.systemInstruction ?? promptConfig.systemInstruction ?? undefined,
		model: templatePrompt?.model ?? promptConfig.model ?? 'GEMINI_2_5_FLASH',
		entityDefinitionId: instanceEntityDefinitionId,
		sharingMode: 'PRIVATE',
		...(variableNames.length > 0 && { inputVariables: variableNames })
	};

	const result = await queryClient.query<{ createPrompt: Prompt }>(
		M_CREATE_PROMPT,
		{ input: instanceInput }
	);

	if (!result?.createPrompt?.id) {
		throw new Error(`Failed to create instance prompt for widget ${widgetId}`);
	}

	return {
		promptId: result.createPrompt.id,
		entityDefinitionId: instanceEntityDefinitionId
	};
}

// ---------------------------------------------------------------------------
// Prompt editing support
// ---------------------------------------------------------------------------

export interface WidgetPromptForEditing {
	promptId: string;
	name: string;
	description: string;
	prompt: string;
	systemInstruction: string;
	model: string;
	entityDefinitionId: string;
	schemaDefinition?: unknown;
}

/**
 * Fetch a per-instance prompt with its linked schema for editing in PromptEditor.
 */
export async function getWidgetInstancePromptForEditing(
	promptId: string,
	queryClient: IGraphQLQueryClient
): Promise<WidgetPromptForEditing | null> {
	const result = await queryClient.query<{ getPrompt: Prompt | null }>(
		Q_GET_PROMPT,
		{ id: promptId }
	);
	const p = result?.getPrompt;
	if (!p) return null;

	const entityDefinitionId = (p as unknown as Record<string, string>).entityDefinitionId ?? '';
	let schemaDefinition: unknown;
	if (entityDefinitionId) {
		try {
			const schemaResult = await queryClient.query<{
				getEntityDefinition: { schemaDefinition: string } | null;
			}>(Q_GET_ENTITY_DEFINITION, { id: entityDefinitionId });
			if (schemaResult?.getEntityDefinition?.schemaDefinition) {
				schemaDefinition = JSON.parse(schemaResult.getEntityDefinition.schemaDefinition);
			}
		} catch {
			log.warn('Could not fetch linked schema for editing');
		}
	}

	return {
		promptId: p.id,
		name: p.name ?? '',
		description: p.description ?? '',
		prompt: p.prompt ?? '',
		systemInstruction: p.systemInstruction ?? '',
		model: p.model ?? 'GEMINI_2_5_FLASH',
		entityDefinitionId,
		schemaDefinition
	};
}

/**
 * Persist user edits from the PromptEditor back to the per-instance entities.
 */
export async function updateWidgetInstancePrompt(
	promptId: string,
	updates: {
		name?: string;
		description?: string;
		prompt?: string;
		systemInstruction?: string;
		model?: string;
		schemaDefinition?: unknown;
	},
	entityDefinitionId: string | undefined,
	queryClient: IGraphQLQueryClient
): Promise<void> {
	const promptUpdate: Record<string, unknown> = {};
	if (updates.name !== undefined) promptUpdate.name = updates.name;
	if (updates.description !== undefined) promptUpdate.description = updates.description;
	if (updates.prompt !== undefined) {
		promptUpdate.prompt = updates.prompt;
		const vars = extractPromptVariables(updates.prompt).map((v) => v.name);
		if (vars.length > 0) promptUpdate.inputVariables = vars;
	}
	if (updates.systemInstruction !== undefined) promptUpdate.systemInstruction = updates.systemInstruction;
	if (updates.model !== undefined) promptUpdate.model = updates.model;

	if (Object.keys(promptUpdate).length > 0) {
		await queryClient.query(M_UPDATE_PROMPT, { id: promptId, input: promptUpdate });
	}

	if (updates.schemaDefinition !== undefined && entityDefinitionId) {
		await ensureEntityDefinition(
			queryClient,
			{
				name: updates.name ? `${updates.name} Output` : 'Structured output',
				schemaDefinition: updates.schemaDefinition
			},
			entityDefinitionId
		);
	}
}

// ---------------------------------------------------------------------------
// Prompt discovery for PromptChooser
// ---------------------------------------------------------------------------

export interface CompatiblePromptInfo {
	id: string;
	name: string;
	description?: string;
	prompt: string;
	model: string;
	updatedAt: string;
	isTemplate?: boolean;
}

/**
 * List all prompts compatible with a widget kind's expected schema.
 * Compatibility tiers:
 *   1. Exact ID match (prompt's entityDefinitionId === template's)
 *   2. Derived schema (sourceEntityDefinitionId chains back to template)
 *   3. Structural match (schema contains required output properties)
 */
export async function listCompatiblePrompts(
	kind: string,
	queryClient: IGraphQLQueryClient
): Promise<CompatiblePromptInfo[]> {
	const promptConfig = getWidgetPromptConfig(kind);
	if (!promptConfig) return [];

	const template = templateCache.get(kind);
	const templateSchemaId = template?.templateEntityDefinitionId;

	const [promptsResult, schemasResult] = await Promise.all([
		queryClient.query<{ listPrompts: { items: Prompt[] } }>(Q_LIST_PROMPTS, {
			scope: 'ALL_TENANT',
			limit: 200
		}),
		queryClient.query<{
			listEntityDefinitions: {
				items: Array<{
					id: string;
					name: string;
					schemaDefinition: string;
					sourceEntityDefinitionId?: string;
				}>;
			};
		}>(Q_LIST_ENTITY_DEFINITIONS, { scope: 'ALL_TENANT', limit: 200 })
	]);

	const allPrompts = promptsResult?.listPrompts?.items ?? [];
	const allSchemas = schemasResult?.listEntityDefinitions?.items ?? [];
	const schemaMap = new Map(allSchemas.map((s) => [s.id, s]));

	// Build required property names from the manifest's Zod schema
	const jsonSchema = zodToJsonSchema(promptConfig.aiOutputSchema, {
		name: 'check',
		$refStrategy: 'none'
	}) as Record<string, unknown>;
	const schemaProps = jsonSchema.properties ?? (jsonSchema as Record<string, unknown>);
	const requiredProps = new Set<string>(
		Array.isArray(jsonSchema.required) ? (jsonSchema.required as string[]) : Object.keys(schemaProps as object)
	);

	const results: Array<CompatiblePromptInfo & { tier: number }> = [];

	for (const prompt of allPrompts) {
		const pEntityDefinitionId = (prompt as unknown as Record<string, string>).entityDefinitionId;
		if (!pEntityDefinitionId) continue;

		const linkedSchema = schemaMap.get(pEntityDefinitionId);
		if (!linkedSchema) continue;

		let tier = -1;

		// Tier 1: exact match
		if (templateSchemaId && pEntityDefinitionId === templateSchemaId) {
			tier = 1;
		}
		// Tier 2: derived
		else if (templateSchemaId && linkedSchema.sourceEntityDefinitionId === templateSchemaId) {
			tier = 2;
		}
		// Tier 3: structural match
		else {
			try {
				const def =
					typeof linkedSchema.schemaDefinition === 'string'
						? JSON.parse(linkedSchema.schemaDefinition)
						: linkedSchema.schemaDefinition;
				if (def && typeof def === 'object' && def.properties) {
					const props = Object.keys(def.properties as object);
					const hasAll = [...requiredProps].every((rp) => props.includes(rp));
					if (hasAll) tier = 3;
				}
			} catch {
				// skip unparseable schemas
			}
		}

		if (tier > 0) {
			const templatePromptName = `widget-template:${kind}`;
			results.push({
				id: prompt.id,
				name: prompt.name ?? 'Untitled',
				description: prompt.description ?? undefined,
				prompt: prompt.prompt ?? '',
				model: prompt.model ?? '',
				updatedAt: prompt.updatedAt ?? '',
				isTemplate: prompt.name === templatePromptName,
				tier
			});
		}
	}

	results.sort((a, b) => a.tier - b.tier);
	return results.map(({ tier: _, ...rest }) => rest);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function findPromptByName(
	queryClient: IGraphQLQueryClient,
	name: string
): Promise<Prompt | null> {
	try {
		const result = await queryClient.query<{ listPrompts: { items: Prompt[] } }>(
			Q_LIST_PROMPTS,
			{ scope: 'OWNED_BY_ME', limit: 200 }
		);
		return result?.listPrompts?.items?.find((p) => p.name === name) ?? null;
	} catch {
		return null;
	}
}
