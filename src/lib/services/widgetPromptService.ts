/**
 * Widget Prompt Service
 *
 * Manages the two-tier Prompt/JsonSchema entity lifecycle for AI-enabled widgets:
 *   Tier 1 — Kind-level templates (created once at app startup per widget kind)
 *   Tier 2 — Per-instance entities (cloned from templates when a widget first uses AI)
 *
 * Registration is idempotent: EntityDefinitions are deduplicated by structural
 * hash (via ensureEntityDefinition) and template Prompts by name + jsonSchemaId.
 *
 * Widgets that declare an `entityDefinition` config without a `promptConfig`
 * will still get their EntityDefinition registered (visible in Ontology Explorer)
 * but no Prompt will be created.
 *
 * Also provides prompt discovery (listCompatiblePrompts) for the PromptChooser UI.
 */

import type { Prompt } from '@stratiqai/types-simple';
import type { WidgetPromptConfig, WidgetEntityDefinitionConfig } from '@stratiqai/dashboard-widget-sdk';
import { zodToJsonSchema } from 'zod-to-json-schema';
import {
	getRegisteredManifests,
	getWidgetManifest,
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
	Q_LIST_JSON_SCHEMAS,
	Q_GET_JSON_SCHEMA
} from '$lib/services/graphql/jsonSchemaOperations';
import type { IGraphQLQueryClient } from '$lib/services/realtime/store/GraphQLQueryClient';
import { extractPromptVariables } from '@stratiqai/dashboard-widget-sdk';
import { createLogger } from '$lib/utils/logger';

const log = createLogger('widget-prompt-svc');

/**
 * @deprecated No longer used — widget EntityDefinitions are now scoped
 * to the current project. Kept temporarily for backward compatibility;
 * will be removed in a future cleanup pass.
 */
export const SYSTEM_PROJECT_ID = '__system__';

// ---------------------------------------------------------------------------
// Template cache (in-memory, per session)
// ---------------------------------------------------------------------------

interface TemplateCache {
	templatePromptId: string;
	templateJsonSchemaId: string;
}

const templateCache = new Map<string, TemplateCache>();

// ---------------------------------------------------------------------------
// Tier 1: Kind-level template sync (app startup)
// ---------------------------------------------------------------------------

/**
 * Resolve the Zod schema and metadata for a widget's EntityDefinition.
 * Prefers the explicit `entityDefinition` config; falls back to deriving
 * from `promptConfig.aiOutputSchema` for backward compatibility.
 */
function resolveEntityDefinitionConfig(
	kind: string,
	entityDef?: WidgetEntityDefinitionConfig,
	promptConfig?: WidgetPromptConfig
): { name: string; description: string; zodSchema: import('zod').ZodSchema } | null {
	if (entityDef) {
		return {
			name: entityDef.name,
			description: entityDef.description ?? `Structured output for ${kind} widgets`,
			zodSchema: entityDef.outputSchema
		};
	}
	if (promptConfig) {
		return {
			name: `widget-template:${kind}:output`,
			description: `Default output schema for ${kind} widgets`,
			zodSchema: promptConfig.aiOutputSchema
		};
	}
	return null;
}

/**
 * Convert a Zod schema to a clean JSON Schema definition object,
 * stripping the outer `definitions` wrapper that zod-to-json-schema may add.
 */
function zodToCleanSchemaDef(zodSchema: import('zod').ZodSchema, refName: string): unknown {
	const jsonSchema = zodToJsonSchema(zodSchema, {
		name: refName,
		$refStrategy: 'none'
	});
	const defs = (jsonSchema as Record<string, unknown>).definitions as
		| Record<string, unknown>
		| undefined;
	return defs ? (defs[refName] ?? jsonSchema) : jsonSchema;
}

/**
 * Ensure all registered widget kinds with entityDefinition or promptConfig
 * have their EntityDefinition (and, when applicable, template Prompt)
 * persisted in the cloud. Called once per project from the project layout.
 *
 * EntityDefinitions are stored under the given projectId so they live in
 * the same scope as the instances that reference them.
 */
export async function syncWidgetTemplates(
	queryClient: IGraphQLQueryClient,
	projectId: string
): Promise<void> {
	const manifests = getRegisteredManifests();
	const eligible = manifests.filter((m) => m.entityDefinition || m.promptConfig);
	if (eligible.length === 0) return;

	await Promise.allSettled(
		eligible.map(async (m) => {
			try {
				const defConfig = resolveEntityDefinitionConfig(m.kind, m.entityDefinition, m.promptConfig);
				if (!defConfig) return;

				const schemaDef = zodToCleanSchemaDef(defConfig.zodSchema, defConfig.name);

				const defResult = await ensureEntityDefinition(queryClient, projectId, {
					name: defConfig.name,
					description: defConfig.description,
					schemaDefinition: schemaDef
				});

				if (m.promptConfig) {
					await ensureWidgetTemplatePrompt(
						m.kind,
						m.promptConfig,
						defResult.jsonSchemaId,
						queryClient
					);
				}
			} catch (err) {
				log.error(`Failed to sync template for widget kind "${m.kind}":`, err);
			}
		})
	);
}

/**
 * Ensure a kind-level template Prompt exists and is linked to the given
 * jsonSchemaId. Idempotent: checks by name first, then by jsonSchemaId.
 */
async function ensureWidgetTemplatePrompt(
	kind: string,
	promptConfig: WidgetPromptConfig,
	jsonSchemaId: string,
	queryClient: IGraphQLQueryClient
): Promise<TemplateCache> {
	const cached = templateCache.get(kind);
	if (cached) return cached;

	const templatePromptName = `widget-template:${kind}`;

	// Look for an existing template prompt by name or by jsonSchemaId
	const existing = await findTemplatePrompt(queryClient, templatePromptName, jsonSchemaId);
	if (existing) {
		const entry: TemplateCache = {
			templatePromptId: existing.id,
			templateJsonSchemaId: (existing as unknown as Record<string, string>).jsonSchemaId ?? jsonSchemaId
		};
		templateCache.set(kind, entry);
		return entry;
	}

	const variableNames = extractPromptVariables(promptConfig.defaultPrompt).map((v) => v.name);

	const promptInput: Record<string, unknown> = {
		name: templatePromptName,
		description: `Default prompt template for ${kind} widgets`,
		prompt: promptConfig.defaultPrompt,
		systemInstruction: promptConfig.systemInstruction ?? undefined,
		model: promptConfig.model ?? 'GEMINI_2_5_FLASH',
		jsonSchemaId,
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
		templateJsonSchemaId: jsonSchemaId
	};
	templateCache.set(kind, entry);
	return entry;
}

/**
 * Internal helper used by ensureWidgetInstancePrompt to get or create the
 * kind-level template (EntityDefinition + Prompt) before cloning.
 */
async function ensureWidgetTemplate(
	kind: string,
	promptConfig: WidgetPromptConfig,
	queryClient: IGraphQLQueryClient,
	projectId: string
): Promise<TemplateCache> {
	const cached = templateCache.get(kind);
	if (cached) return cached;

	const defConfig = resolveEntityDefinitionConfig(kind, undefined, promptConfig);
	if (!defConfig) throw new Error(`Widget kind "${kind}" has no schema config`);

	const schemaDef = zodToCleanSchemaDef(defConfig.zodSchema, defConfig.name);

	const defResult = await ensureEntityDefinition(queryClient, projectId, {
		name: defConfig.name,
		description: defConfig.description,
		schemaDefinition: schemaDef
	});

	return ensureWidgetTemplatePrompt(kind, promptConfig, defResult.jsonSchemaId, queryClient);
}

// ---------------------------------------------------------------------------
// Tier 2: Per-instance entities
// ---------------------------------------------------------------------------

export interface WidgetInstancePrompt {
	promptId: string;
	jsonSchemaId: string;
	entityDefinitionId: string;
}

/**
 * Ensure a widget instance has its own Prompt + JsonSchema entities.
 * If existingPromptId is provided and valid, returns it.
 * Otherwise clones from the kind-level template.
 */
export async function ensureWidgetInstancePrompt(
	kind: string,
	widgetId: string,
	widgetTitle: string | undefined,
	widgetDescription: string | undefined,
	existingPromptId: string | undefined,
	queryClient: IGraphQLQueryClient,
	projectId: string
): Promise<WidgetInstancePrompt> {
	if (existingPromptId) {
		try {
			const existing = await queryClient.query<{ getPrompt: Prompt | null }>(
				Q_GET_PROMPT,
				{ id: existingPromptId }
			);
			if (existing?.getPrompt) {
				const prompt = existing.getPrompt as unknown as Record<string, string>;
				return {
					promptId: existing.getPrompt.id,
					jsonSchemaId: prompt.jsonSchemaId ?? '',
					entityDefinitionId: prompt.entityDefinitionId ?? ''
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

	const template = await ensureWidgetTemplate(kind, promptConfig, queryClient, projectId);

	const manifest = getWidgetManifest(kind);
	const friendlyName = widgetTitle || manifest?.displayName || kind;
	const instanceSchemaName = `${friendlyName} Output`;

	// Clone template JsonSchema for this instance
	let templateSchemaDef: unknown;
	try {
		const schemaResult = await queryClient.query<{
			getJsonSchema: { schemaDefinition: string } | null;
		}>(Q_GET_JSON_SCHEMA, { id: template.templateJsonSchemaId });
		templateSchemaDef = schemaResult?.getJsonSchema?.schemaDefinition
			? JSON.parse(schemaResult.getJsonSchema.schemaDefinition)
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

	const instanceDefResult = await ensureEntityDefinition(queryClient, projectId, {
		name: instanceSchemaName,
		description: widgetDescription || `Output schema for ${friendlyName}`,
		schemaDefinition: templateSchemaDef
	});
	const instanceJsonSchemaId = instanceDefResult.jsonSchemaId;
	const instanceEntityDefinitionId = instanceDefResult.entityDefinitionId;

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

	const instancePromptName = widgetTitle || manifest?.displayName || kind;
	const promptText = templatePrompt?.prompt ?? promptConfig.defaultPrompt;
	const variableNames = extractPromptVariables(promptText).map((v) => v.name);

	const instanceInput: Record<string, unknown> = {
		name: instancePromptName,
		description: widgetDescription || templatePrompt?.description || undefined,
		prompt: promptText,
		systemInstruction:
			templatePrompt?.systemInstruction ?? promptConfig.systemInstruction ?? undefined,
		model: templatePrompt?.model ?? promptConfig.model ?? 'GEMINI_2_5_FLASH',
		jsonSchemaId: instanceJsonSchemaId,
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
		jsonSchemaId: instanceJsonSchemaId,
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
	jsonSchemaId: string;
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

	const jsonSchemaId = (p as unknown as Record<string, string>).jsonSchemaId ?? '';
	let schemaDefinition: unknown;
	if (jsonSchemaId) {
		try {
			const schemaResult = await queryClient.query<{
				getJsonSchema: { schemaDefinition: string } | null;
			}>(Q_GET_JSON_SCHEMA, { id: jsonSchemaId });
			if (schemaResult?.getJsonSchema?.schemaDefinition) {
				schemaDefinition = JSON.parse(schemaResult.getJsonSchema.schemaDefinition);
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
		jsonSchemaId,
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
	jsonSchemaId: string | undefined,
	queryClient: IGraphQLQueryClient,
	projectId: string
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

	if (updates.schemaDefinition !== undefined && projectId) {
		const defResult = await ensureEntityDefinition(queryClient, projectId, {
			name: updates.name ? `${updates.name} Output` : 'Structured output',
			schemaDefinition: updates.schemaDefinition
		});
		if (defResult.jsonSchemaId !== jsonSchemaId) {
			promptUpdate.jsonSchemaId = defResult.jsonSchemaId;
		}
	}

	if (Object.keys(promptUpdate).length > 0) {
		await queryClient.query(M_UPDATE_PROMPT, { id: promptId, input: promptUpdate });
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
 *   1. Exact ID match (prompt's jsonSchemaId === template's)
 *   2. Derived schema (sourceJsonSchemaId chains back to template)
 *   3. Structural match (schema contains required output properties)
 */
export async function listCompatiblePrompts(
	kind: string,
	queryClient: IGraphQLQueryClient
): Promise<CompatiblePromptInfo[]> {
	const promptConfig = getWidgetPromptConfig(kind);
	if (!promptConfig) return [];

	const template = templateCache.get(kind);
	const templateSchemaId = template?.templateJsonSchemaId;

	const [promptsResult, schemasResult] = await Promise.all([
		queryClient.query<{ listPrompts: { items: Prompt[] } }>(Q_LIST_PROMPTS, {
			scope: 'ALL_TENANT',
			limit: 200
		}),
		queryClient.query<{
			listJsonSchemas: {
				items: Array<{
					id: string;
					name: string;
					schemaDefinition: string;
					sourceJsonSchemaId?: string;
				}>;
			};
		}>(Q_LIST_JSON_SCHEMAS, { scope: 'ALL_TENANT', limit: 200 })
	]);

	const allPrompts = promptsResult?.listPrompts?.items ?? [];
	const allSchemas = schemasResult?.listJsonSchemas?.items ?? [];
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
		const pJsonSchemaId = (prompt as unknown as Record<string, string>).jsonSchemaId;
		if (!pJsonSchemaId) continue;

		const linkedSchema = schemaMap.get(pJsonSchemaId);
		if (!linkedSchema) continue;

		let tier = -1;

		// Tier 1: exact match
		if (templateSchemaId && pJsonSchemaId === templateSchemaId) {
			tier = 1;
		}
		// Tier 2: derived
		else if (templateSchemaId && linkedSchema.sourceJsonSchemaId === templateSchemaId) {
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

/**
 * Find an existing template prompt by name or by linked jsonSchemaId.
 * A match on either criterion counts — this avoids creating duplicates
 * when the template was previously created under a slightly different name
 * or when the same schema was linked to another prompt.
 */
async function findTemplatePrompt(
	queryClient: IGraphQLQueryClient,
	name: string,
	jsonSchemaId?: string
): Promise<Prompt | null> {
	try {
		const result = await queryClient.query<{ listPrompts: { items: Prompt[] } }>(
			Q_LIST_PROMPTS,
			{ scope: 'OWNED_BY_ME', limit: 200 }
		);
		const items = result?.listPrompts?.items ?? [];

		const byName = items.find((p) => p.name === name);
		if (byName) return byName;

		if (jsonSchemaId) {
			const bySchema = items.find(
				(p) => (p as unknown as Record<string, string>).jsonSchemaId === jsonSchemaId
			);
			if (bySchema) return bySchema;
		}

		return null;
	} catch {
		return null;
	}
}
