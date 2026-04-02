<script lang="ts">
	import type { Prompt } from '@stratiqai/types-simple';
	import type { AiModel } from '@stratiqai/types-simple';
	import type {
		NestedItemSchema,
		NestedSchemaNodeType,
		NestedSchemaPropertyNode
	} from '$lib/schema/promptSchemaTreeTypes';
	import SchemaNodesEditor from './SchemaNodesEditor.svelte';
	import JsonSchemaPickerModal from '$lib/components/schemas/JsonSchemaPickerModal.svelte';
	import { Q_GET_JSON_SCHEMA } from '$lib/graphql/jsonSchemaOperations';
	import { M_GENERATE_PROMPT_DRAFT } from '$lib/graphql/promptOperations';
	import type { IGraphQLQueryClient } from '$lib/realtime/store/GraphQLQueryClient';
	import { getTemplateStrForEditor, parseTemplateToAIQueryData, type AIQueryData } from '../PromptService';

	/** All valid AIModel enum values (schema) — used so 3.1 and all models pass VALID_AI_MODELS.has() */
	const AIMODEL_VALUES: readonly string[] = [
		'GEMINI_3_1_PRO_PREVIEW',
		'GEMINI_3_1_FLASH_PREVIEW',
		'GEMINI_3_PRO_PREVIEW',
		'GEMINI_3_FLASH_PREVIEW',
		'GEMINI_2_5_PRO',
		'GEMINI_2_5_FLASH',
		'GEMINI_2_5_FLASH_LITE'
	];

	const VALID_AI_MODELS = new Set<string>(AIMODEL_VALUES);

	/** Default model (no selector in UI). Used for new prompts and fallback when loading. */
	const DEFAULT_AI_MODEL: AiModel = 'GEMINI_3_1_FLASH_PREVIEW' as AiModel;

	/** Default system prompt (no field in UI). Used for new prompts and when template has none. */
	const DEFAULT_SYSTEM_PROMPT =
		'You are a expert commercial real estate investor and broker that can evaluate documents and extract information';

	function normalizeToAIModel(value: string | undefined): AiModel {
		if (value && VALID_AI_MODELS.has(value)) return value as AiModel;
		// Legacy editor values
		if (value === 'gemini-3.1-pro-preview') return 'GEMINI_3_1_PRO_PREVIEW' as AiModel;
		if (value === 'gemini-3.1-flash-preview') return 'GEMINI_3_1_FLASH_PREVIEW' as AiModel;
		if (value === 'gemini-3-flash-preview') return 'GEMINI_3_FLASH_PREVIEW';
		if (value === 'gemini-3-pro-preview') return 'GEMINI_3_PRO_PREVIEW';
		return DEFAULT_AI_MODEL;
	}

	let {
		darkMode = false,
		template = null,
		isCreating = false,
		queryClient = null,
		onSave,
		onCancel
	}: {
		darkMode?: boolean;
		template?: Prompt | null;
		isCreating?: boolean;
		queryClient?: IGraphQLQueryClient | null;
		onSave?: (data: {
			name: string;
			description: string;
			aiQueryData: AIQueryData;
			jsonSchemaId?: string;
			schemaData?: { name: string; description?: string; schemaDefinition: unknown };
		}) => void | Promise<void>;
		onCancel?: () => void;
	} = $props();

	/** Track the jsonSchemaId from the loaded template (if any) */
	let currentJsonSchemaId = $state<string | undefined>(undefined);
	let showSchemaPicker = $state(false);

	let saving = $state(false);

	// Template metadata fields
	let templateName = $state('');
	let templateDescription = $state('');

	// Basic AI query fields
	let aiQueryModel = $state<AiModel>(DEFAULT_AI_MODEL);
	let aiQuerySystemPrompt = $state(DEFAULT_SYSTEM_PROMPT);
	let aiQueryPrompt = $state('');

	// Advanced fields - Model Parameters
	let temperature = $state<number | undefined>(undefined);
	let maxTokens = $state<number | undefined>(undefined);
	let topP = $state<number | undefined>(undefined);
	let frequencyPenalty = $state<number | undefined>(undefined);
	let presencePenalty = $state<number | undefined>(undefined);
	let stopSequences = $state<string>('');

	// Advanced fields - Response Format
	let responseFormatType = $state<'text' | 'json_object' | 'json_schema'>('json_schema');
	let jsonSchemaText = $state('');

	function newNestedId(): string {
		return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `nested_${Date.now()}_${Math.random().toString(36).slice(2)}`;
	}

	// Schema Builder State
	let schemaProperties = $state<Record<string, any>>({});
	let schemaRequired = $state<string[]>([]);
	let fieldOrder = $state<string[]>([]);

	// Advanced fields - Options
	let stream = $state(false);
	let user = $state('');
	let seed = $state<number | undefined>(undefined);
	let logitBiasText = $state('');
	let metadataText = $state('');

	// UI state
	let showAdvanced = $state(false);

	// AI Generate state
	let aiGenerateDescription = $state('');
	let aiGenerating = $state(false);
	let aiGenerateError = $state('');

	// Paste JSON Schema state
	let showPasteJson = $state(false);
	let pasteJsonText = $state('');
	let pasteJsonError = $state('');

	// Extract input variables from prompt text: {{name}} and {name} (single-brace for e.g. {input})
	function extractPromptVariables(text: string): { name: string; syntax: string }[] {
		if (!text?.trim()) return [];
		const seen = new Set<string>();
		const result: { name: string; syntax: string }[] = [];
		// Match {{variable}} first, then {variable} (avoid double-counting {{x}} as {x})
		const doubleRegex = /\{\{([^}]+)\}\}/g;
		const singleRegex = /\{([^{}]+)\}/g;
		let m: RegExpExecArray | null;
		while ((m = doubleRegex.exec(text)) !== null) {
			const name = m[1].trim();
			if (name && !seen.has(name)) {
				seen.add(name);
				result.push({ name, syntax: `{{${name}}}` });
			}
		}
		while ((m = singleRegex.exec(text)) !== null) {
			const name = m[1].trim();
			if (name && !seen.has(name)) {
				seen.add(name);
				result.push({ name, syntax: `{${name}}` });
			}
		}
		return result;
	}

	let promptInputVariables = $derived(extractPromptVariables(aiQueryPrompt));

	// Initialize form from template or defaults
	$effect(() => {
		if (template) {
			templateName = template.name || '';
			templateDescription = template.description || '';
			currentJsonSchemaId = (template as { jsonSchemaId?: string }).jsonSchemaId ?? undefined;
			if (currentJsonSchemaId && queryClient) {
				loadJsonSchemaById(currentJsonSchemaId);
			}

			const templateStr = getTemplateStrForEditor(template);
			const data = parseTemplateToAIQueryData(templateStr);

			aiQueryPrompt = data.prompt || '';
			aiQueryModel = normalizeToAIModel((template as { model?: string }).model ?? data.model);
			aiQuerySystemPrompt = data.systemPrompt || DEFAULT_SYSTEM_PROMPT;

			temperature = data.temperature;
			maxTokens = data.maxTokens;
			topP = data.topP;
			frequencyPenalty = data.frequencyPenalty;
			presencePenalty = data.presencePenalty;
			stopSequences = Array.isArray(data.stop)
				? data.stop.join(', ')
				: data.stop ?? '';

			if (data.responseFormat) {
				const rf = data.responseFormat;
				const rfType = (rf as { type: string }).type;
				responseFormatType = (rfType === 'json_schema_nested' ? 'json_schema' : rfType) as
					| 'text'
					| 'json_object'
					| 'json_schema';
				if (
					(rfType === 'json_schema' || rfType === 'json_schema_nested') &&
					(rf as { schema?: unknown }).schema
				) {
					const schema = (rf as { schema: any }).schema;
					jsonSchemaText = JSON.stringify(schema, null, 2);
					if (schema.properties) {
						const next: Record<string, any> = {};
						for (const [key, def] of Object.entries(schema.properties as Record<string, Record<string, unknown>>)) {
							next[key] = flatFieldFromJsonSchemaFragment(def);
						}
						schemaProperties = next;
						schemaRequired = schema.required ? [...schema.required] : [];
						fieldOrder = Object.keys(schema.properties);
					}
				}
			} else {
				// Default to Structured form when no format is saved (e.g. legacy prompts or create)
				responseFormatType = 'json_schema';
				schemaProperties = {};
				schemaRequired = [];
				fieldOrder = [];
			}

			stream = data.stream ?? false;
			user = data.user ?? '';
			seed = data.seed;
			logitBiasText = data.logitBias ? JSON.stringify(data.logitBias, null, 2) : '';
			metadataText = data.metadata ? JSON.stringify(data.metadata, null, 2) : '';

			showAdvanced = Boolean(
				temperature !== undefined ||
				maxTokens !== undefined ||
				topP !== undefined ||
				frequencyPenalty !== undefined ||
				presencePenalty !== undefined ||
				stopSequences ||
				stream ||
				user ||
				seed !== undefined ||
				logitBiasText ||
				metadataText
			);
		} else if (isCreating) {
			// Reset to defaults for new template
			templateName = '';
			templateDescription = '';
			currentJsonSchemaId = undefined;
			aiQueryPrompt = 'Analyze the following data and provide insights: {input}';
			aiQueryModel = DEFAULT_AI_MODEL;
			aiQuerySystemPrompt = DEFAULT_SYSTEM_PROMPT;
			temperature = undefined;
			maxTokens = undefined;
			topP = undefined;
			frequencyPenalty = undefined;
			presencePenalty = undefined;
			stopSequences = '';
			responseFormatType = 'json_schema';
			jsonSchemaText = '';
			schemaProperties = {};
			schemaRequired = [];
			fieldOrder = [];
			stream = false;
			user = '';
			seed = undefined;
			logitBiasText = '';
			metadataText = '';
			showAdvanced = false;
		}
	});

	// Schema Builder Functions
	let orderedFieldEntries = $derived.by(() => {
		const entries: Array<[string, any]> = [];
		for (const fieldName of fieldOrder) {
			if (schemaProperties[fieldName]) {
				entries.push([fieldName, schemaProperties[fieldName]]);
			}
		}
		for (const [fieldName, fieldSchema] of Object.entries(schemaProperties)) {
			if (!fieldOrder.includes(fieldName)) {
				entries.push([fieldName, fieldSchema]);
			}
		}
		return entries;
	});

	function addSchemaField(isReasoning: boolean = false) {
		const fieldName = isReasoning
			? 'reasoning'
			: `field_${Object.keys(schemaProperties).length + 1}`;

		if (isReasoning && schemaProperties[fieldName]) {
			return;
		}

		const baseField: any = { type: 'string' };
		if (isReasoning) {
			baseField.description =
				'A step-by-step internal monologue explaining the logic and reasoning behind the values chosen for all other fields.';
		}

		if (isReasoning) {
			const newProps: Record<string, any> = { [fieldName]: baseField };
			for (const [key, value] of Object.entries(schemaProperties)) {
				newProps[key] = value;
			}
			schemaProperties = newProps;
			fieldOrder = [fieldName, ...fieldOrder];
		} else {
			schemaProperties[fieldName] = baseField;
			fieldOrder = [...fieldOrder, fieldName];
		}

		if (!schemaRequired.includes(fieldName)) {
			schemaRequired.push(fieldName);
		}
		schemaProperties = { ...schemaProperties };
		schemaRequired = [...schemaRequired];
	}

	function removeSchemaField(fieldName: string) {
		delete schemaProperties[fieldName];
		fieldOrder = fieldOrder.filter((name) => name !== fieldName);
		schemaRequired = schemaRequired.filter((r) => r !== fieldName);
		schemaProperties = { ...schemaProperties };
		schemaRequired = [...schemaRequired];
	}

	function updateSchemaField(fieldName: string, updates: Partial<any>) {
		if (schemaProperties[fieldName]) {
			schemaProperties[fieldName] = { ...schemaProperties[fieldName], ...updates };
			schemaProperties = { ...schemaProperties };
		}
	}

	function updateSchemaFieldType(fieldName: string, type: string) {
		if (!schemaProperties[fieldName]) return;
		const current = schemaProperties[fieldName];
		const updated: Record<string, unknown> = { ...current, type };
		if (type !== 'string') {
			delete updated.enum;
			delete updated.pattern;
		}
		if (type !== 'number' && type !== 'integer') {
			delete updated.minimum;
			delete updated.maximum;
		}
		const t = type as NestedSchemaNodeType;
		if (t === 'object') {
			updated.objectChildren = (current.objectChildren as NestedSchemaPropertyNode[] | undefined) ?? [];
			delete updated.itemSchema;
		} else if (t === 'array') {
			updated.itemSchema =
				(current.itemSchema as NestedItemSchema | undefined) ?? ({ type: 'string' } satisfies NestedItemSchema);
			delete updated.objectChildren;
		} else {
			delete updated.objectChildren;
			delete updated.itemSchema;
		}
		updateSchemaField(fieldName, updated);
	}

	function toggleSchemaFieldRequired(fieldName: string) {
		if (schemaRequired.includes(fieldName)) {
			schemaRequired = schemaRequired.filter((r) => r !== fieldName);
		} else {
			schemaRequired = [...schemaRequired, fieldName];
		}
	}

	function updateFieldName(oldName: string, newName: string) {
		if (!newName || newName === oldName) return;
		if (schemaProperties[newName]) {
			alert('A field with this name already exists');
			return;
		}

		const wasRequired = schemaRequired.includes(oldName);
		const fieldData = schemaProperties[oldName];
		const oldIndex = fieldOrder.indexOf(oldName);

		delete schemaProperties[oldName];
		fieldOrder = fieldOrder.filter((name) => name !== oldName);
		schemaRequired = schemaRequired.filter((r) => r !== oldName);

		schemaProperties[newName] = fieldData;
		fieldOrder = [...fieldOrder.slice(0, oldIndex), newName, ...fieldOrder.slice(oldIndex)];

		if (wasRequired) {
			schemaRequired = [...schemaRequired, newName];
		}
		schemaProperties = { ...schemaProperties };
	}

	// --- Nested schema: tree <-> JSON Schema ---
	function nestedNodeToJsonSchema(node: NestedSchemaPropertyNode): Record<string, unknown> {
		const base: Record<string, unknown> = {
			type: node.type,
			...(node.description && { description: node.description }),
			...(node.enum && node.enum.length > 0 && { enum: node.enum }),
			...(node.minimum !== undefined && { minimum: node.minimum }),
			...(node.maximum !== undefined && { maximum: node.maximum })
		};
		if (node.type === 'object') {
			const properties: Record<string, unknown> = {};
			const required: string[] = [];
			for (const child of node.children ?? []) {
				if (child.name.trim()) {
					properties[child.name.trim()] = nestedNodeToJsonSchema(child);
					if (child.required) required.push(child.name.trim());
				}
			}
			base.properties = properties;
			if (required.length > 0) base.required = required;
			base.additionalProperties = false;
		} else if (node.type === 'array' && node.itemSchema) {
			base.items = nestedItemSchemaToJsonSchema(node.itemSchema);
		}
		return base;
	}

	function nestedItemSchemaToJsonSchema(item: NestedItemSchema): Record<string, unknown> {
		const base: Record<string, unknown> = {
			type: item.type,
			...(item.description && { description: item.description }),
			...(item.enum && item.enum.length > 0 && { enum: item.enum }),
			...(item.minimum !== undefined && { minimum: item.minimum }),
			...(item.maximum !== undefined && { maximum: item.maximum })
		};
		if (item.type === 'object') {
			const properties: Record<string, unknown> = {};
			const required: string[] = [];
			for (const child of item.properties ?? []) {
				if (child.name.trim()) {
					properties[child.name.trim()] = nestedNodeToJsonSchema(child);
					if (child.required) required.push(child.name.trim());
				}
			}
			base.properties = properties;
			if (required.length > 0) base.required = required;
			base.additionalProperties = false;
		} else if (item.type === 'array' && item.items) {
			base.items = nestedItemSchemaToJsonSchema(item.items);
		}
		return base;
	}

	function topLevelFieldToJsonSchema(field: Record<string, unknown>): Record<string, unknown> {
		const t = (field.type as string) || 'string';
		const description = field.description as string | undefined;
		const common = description ? { description } : {};
		if (t === 'object') {
			const nodes = (field.objectChildren as NestedSchemaPropertyNode[] | undefined) ?? [];
			const properties: Record<string, unknown> = {};
			const required: string[] = [];
			for (const child of nodes) {
				if (child.name?.trim()) {
					const nm = child.name.trim();
					properties[nm] = nestedNodeToJsonSchema(child);
					if (child.required) required.push(nm);
				}
			}
			return {
				type: 'object',
				...common,
				properties,
				...(required.length > 0 ? { required } : {}),
				additionalProperties: false
			};
		}
		if (t === 'array') {
			const items = field.itemSchema
				? nestedItemSchemaToJsonSchema(field.itemSchema as NestedItemSchema)
				: { type: 'string' };
			return { type: 'array', ...common, items };
		}
		if (t === 'string') {
			const out: Record<string, unknown> = { type: 'string', ...common };
			const en = field.enum as string[] | undefined;
			if (en?.length) out.enum = en;
			if (field.pattern) out.pattern = field.pattern;
			return out;
		}
		if (t === 'number' || t === 'integer') {
			const out: Record<string, unknown> = { type: t, ...common };
			if (field.minimum !== undefined) out.minimum = field.minimum;
			if (field.maximum !== undefined) out.maximum = field.maximum;
			return out;
		}
		if (t === 'boolean') {
			return { type: 'boolean', ...common };
		}
		return { type: 'string', ...common };
	}

	let schemaPreview = $derived.by(() => {
		const properties: Record<string, unknown> = {};
		for (const [key, field] of Object.entries(schemaProperties)) {
			properties[key] = topLevelFieldToJsonSchema(field);
		}
		return {
			type: 'object',
			properties,
			required: schemaRequired,
			additionalProperties: false,
			$schema: 'http://json-schema.org/draft-07/schema#'
		};
	});

	function jsonSchemaToPropertyNode(
		id: string,
		name: string,
		def: Record<string, unknown>,
		required: boolean
	): NestedSchemaPropertyNode {
		const nodeType = (def.type as NestedSchemaNodeType) || 'string';
		const node: NestedSchemaPropertyNode = {
			id,
			name,
			type: nodeType,
			required,
			description: (def.description as string) || '',
			enum: Array.isArray(def.enum) ? (def.enum as string[]) : undefined,
			minimum: def.minimum as number | undefined,
			maximum: def.maximum as number | undefined
		};
		if (nodeType === 'object' && def.properties && typeof def.properties === 'object') {
			const requiredList = (def.required as string[]) || [];
			node.children = Object.entries(def.properties as Record<string, Record<string, unknown>>).map(([n, d]) =>
				jsonSchemaToPropertyNode(newNestedId(), n, d, requiredList.includes(n))
			);
		} else if (nodeType === 'array' && def.items && typeof def.items === 'object') {
			node.itemSchema = jsonSchemaToItemSchema(def.items as Record<string, unknown>);
		}
		return node;
	}

	function jsonSchemaToItemSchema(def: Record<string, unknown>): NestedItemSchema {
		const type = (def.type as NestedSchemaNodeType) || 'string';
		const item: NestedItemSchema = {
			type,
			description: def.description as string | undefined,
			enum: Array.isArray(def.enum) ? (def.enum as string[]) : undefined,
			minimum: def.minimum as number | undefined,
			maximum: def.maximum as number | undefined
		};
		if (type === 'object' && def.properties && typeof def.properties === 'object') {
			const requiredList = (def.required as string[]) || [];
			item.properties = Object.entries(def.properties as Record<string, Record<string, unknown>>).map(([n, d]) =>
				jsonSchemaToPropertyNode(newNestedId(), n, d, requiredList.includes(n))
			);
		} else if (type === 'array' && def.items && typeof def.items === 'object') {
			item.items = jsonSchemaToItemSchema(def.items as Record<string, unknown>);
		}
		return item;
	}

	/** Map a JSON Schema property definition into flat "structured form" field state (objectChildren / itemSchema). */
	function flatFieldFromJsonSchemaFragment(def: Record<string, unknown>): Record<string, unknown> {
		const node = jsonSchemaToPropertyNode(newNestedId(), '_', def, false);
		const base: Record<string, unknown> = {
			type: node.type,
			description: node.description || '',
			...(node.enum?.length ? { enum: node.enum } : {}),
			...(node.minimum !== undefined ? { minimum: node.minimum } : {}),
			...(node.maximum !== undefined ? { maximum: node.maximum } : {})
		};
		if (node.type === 'object') {
			base.objectChildren = node.children ?? [];
		}
		if (node.type === 'array' && node.itemSchema) {
			base.itemSchema = node.itemSchema;
		}
		return base;
	}

	/** Load schema definition from a JsonSchema entity and populate the form fields. */
	function applySchemaDefinitionToForm(schemaDefRaw: unknown) {
		const schema = typeof schemaDefRaw === 'string'
			? (() => { try { return JSON.parse(schemaDefRaw); } catch { return {}; } })()
			: (schemaDefRaw as Record<string, unknown>);
		jsonSchemaText = typeof schemaDefRaw === 'string' ? schemaDefRaw : JSON.stringify(schema, null, 2);

		// #region agent log
		fetch('http://127.0.0.1:7574/ingest/4d5fe42c-52eb-4139-a797-75aa8980d08f',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'02ed34'},body:JSON.stringify({sessionId:'02ed34',location:'PromptEditModal.svelte:applySchemaDefinitionToForm',message:'parsed schema inside apply',data:{rawType:typeof schemaDefRaw,parsedType:typeof schema,hasProperties:!!(schema&&typeof schema==='object'&&schema.properties),parsedKeys:schema&&typeof schema==='object'?Object.keys(schema):null,parsedPreview:JSON.stringify(schema)?.substring(0,600)},timestamp:Date.now(),hypothesisId:'H1,H3'})}).catch(()=>{});
		// #endregion

		responseFormatType = 'json_schema';
		if (schema && typeof schema === 'object' && schema.properties) {
			const props = schema.properties as Record<string, Record<string, unknown>>;
			const next: Record<string, any> = {};
			for (const [key, def] of Object.entries(props)) {
				next[key] = flatFieldFromJsonSchemaFragment(def);
			}
			schemaProperties = next;
			schemaRequired = Array.isArray(schema.required) ? [...(schema.required as string[])] : [];
			fieldOrder = Object.keys(props);
		} else {
			schemaProperties = {};
			schemaRequired = [];
			fieldOrder = [];
		}
	}

	/** Fetch a JsonSchema entity by ID and populate the form. */
	async function loadJsonSchemaById(id: string) {
		if (!queryClient) return;
		try {
			const result = await queryClient.query<{ getJsonSchema: { id: string; schemaDefinition: string } | null }>(
				Q_GET_JSON_SCHEMA,
				{ id }
			);
			if (result?.getJsonSchema?.schemaDefinition) {
				applySchemaDefinitionToForm(result.getJsonSchema.schemaDefinition);
			}
		} catch (e) {
			console.error('Failed to load JsonSchema:', e);
		}
	}

	/** Handle selection from the schema picker modal. */
	function handleSchemaPickerSelect(schema: { id: string; schemaDefinition: string }) {
		currentJsonSchemaId = schema.id;
		applySchemaDefinitionToForm(schema.schemaDefinition);
		showSchemaPicker = false;
	}

	async function handleAiGenerate() {
		if (!queryClient || !aiGenerateDescription.trim() || aiGenerating) return;
		aiGenerating = true;
		aiGenerateError = '';
		try {
			const result = await queryClient.query<{
				generatePromptDraft: {
					prompt: string;
					systemInstruction: string | null;
					jsonSchema: string | null;
					suggestedName: string | null;
				} | null;
			}>(M_GENERATE_PROMPT_DRAFT, { input: { description: aiGenerateDescription.trim() } });

			const draft = result?.generatePromptDraft;
			if (!draft) {
				aiGenerateError = 'No result returned from AI';
				return;
			}

			// #region agent log
			fetch('http://127.0.0.1:7574/ingest/4d5fe42c-52eb-4139-a797-75aa8980d08f',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'02ed34'},body:JSON.stringify({sessionId:'02ed34',location:'PromptEditModal.svelte:handleAiGenerate',message:'draft received from mutation',data:{hasJsonSchema:draft.jsonSchema!=null,jsonSchemaType:typeof draft.jsonSchema,jsonSchemaValue:typeof draft.jsonSchema==='string'?draft.jsonSchema.substring(0,500):JSON.stringify(draft.jsonSchema)?.substring(0,500),suggestedName:draft.suggestedName,promptLength:draft.prompt?.length},timestamp:Date.now(),hypothesisId:'H1,H2,H5'})}).catch(()=>{});
			// #endregion

			if (draft.suggestedName) templateName = draft.suggestedName;
			aiQueryPrompt = draft.prompt;
			if (draft.systemInstruction) aiQuerySystemPrompt = draft.systemInstruction;

			if (draft.jsonSchema) {
				applySchemaDefinitionToForm(draft.jsonSchema);
			}

			// #region agent log
			fetch('http://127.0.0.1:7574/ingest/4d5fe42c-52eb-4139-a797-75aa8980d08f',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'02ed34'},body:JSON.stringify({sessionId:'02ed34',location:'PromptEditModal.svelte:handleAiGenerate:afterApply',message:'state after applySchemaDefinitionToForm',data:{responseFormatType,schemaPropertiesKeys:Object.keys(schemaProperties),schemaRequired,fieldOrderLength:fieldOrder.length,jsonSchemaTextLength:jsonSchemaText.length},timestamp:Date.now(),hypothesisId:'H3,H4'})}).catch(()=>{});
			// #endregion

			aiGenerateDescription = '';
		} catch (e) {
			console.error('AI generate failed:', e);
			aiGenerateError = e instanceof Error ? e.message : 'Generation failed';
		} finally {
			aiGenerating = false;
		}
	}

	function handlePasteJsonApply() {
		pasteJsonError = '';
		const text = pasteJsonText.trim();
		if (!text) {
			pasteJsonError = 'Please paste a JSON schema';
			return;
		}
		try {
			const parsed = JSON.parse(text);
			if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
				pasteJsonError = 'Must be a JSON object';
				return;
			}
			applySchemaDefinitionToForm(parsed);
			pasteJsonText = '';
			showPasteJson = false;
		} catch {
			pasteJsonError = 'Invalid JSON — check syntax and try again';
		}
	}

	async function handleSave() {
		if (!templateName.trim()) {
			alert('Please enter a template name');
			return;
		}
		if (responseFormatType === 'json_schema' && Object.keys(schemaProperties).length > 0) {
			const missing = orderedFieldEntries
				.filter(([, f]) => !f.description?.trim())
				.map(([name]) => name);
			if (missing.length > 0) {
				alert(`Please add a description for: ${missing.join(', ')}`);
				return;
			}
		}
		if (!onSave) {
			alert('Save handler is not available. Please refresh the page.');
			return;
		}
		if (saving) return;

		// Ensure model is sent as a string (GraphQL enum value); avoids issues with 3.1 or other enum values
		const modelValue = typeof aiQueryModel === 'string' ? aiQueryModel : String(aiQueryModel);
		const aiQueryData: AIQueryData = {
			model: modelValue,
			prompt: aiQueryPrompt
		};

		aiQueryData.systemPrompt = aiQuerySystemPrompt || DEFAULT_SYSTEM_PROMPT;
		if (temperature !== undefined) aiQueryData.temperature = temperature;
		if (maxTokens !== undefined) aiQueryData.maxTokens = maxTokens;
		if (topP !== undefined) aiQueryData.topP = topP;
		if (frequencyPenalty !== undefined) aiQueryData.frequencyPenalty = frequencyPenalty;
		if (presencePenalty !== undefined) aiQueryData.presencePenalty = presencePenalty;
		if (stopSequences.trim()) {
			const stopArray = stopSequences.split(',').map((s) => s.trim()).filter(Boolean);
			aiQueryData.stop = stopArray.length === 1 ? stopArray[0] : stopArray;
		}

		if (responseFormatType !== 'text') {
			if (responseFormatType === 'json_object') {
				aiQueryData.responseFormat = { type: 'json_object' };
			} else if (responseFormatType === 'json_schema') {
				if (Object.keys(schemaProperties).length > 0) {
					aiQueryData.responseFormat = { type: 'json_schema', schema: schemaPreview };
				} else if (jsonSchemaText.trim()) {
					try {
						const schema = JSON.parse(jsonSchemaText);
						aiQueryData.responseFormat = { type: 'json_schema', schema };
					} catch (e) {
						console.error('Invalid JSON schema:', e);
					}
				}
			}
		}

		if (stream) aiQueryData.stream = true;
		if (user.trim()) aiQueryData.user = user.trim();
		if (seed !== undefined) aiQueryData.seed = seed;
		if (logitBiasText.trim()) {
			try {
				aiQueryData.logitBias = JSON.parse(logitBiasText);
			} catch (e) {
				console.error('Invalid logit bias:', e);
			}
		}
		if (metadataText.trim()) {
			try {
				aiQueryData.metadata = JSON.parse(metadataText);
			} catch (e) {
				console.error('Invalid metadata:', e);
			}
		}

		let schemaData: { name: string; description?: string; schemaDefinition: unknown } | undefined;
		if (responseFormatType === 'json_schema') {
			if (Object.keys(schemaProperties).length > 0) {
				schemaData = {
					name: templateName.trim() || 'Structured output',
					description: templateDescription.trim() || undefined,
					schemaDefinition: schemaPreview
				};
			} else if (jsonSchemaText.trim()) {
				try {
					const parsed = JSON.parse(jsonSchemaText);
					schemaData = {
						name: templateName.trim() || 'Structured output',
						description: templateDescription.trim() || undefined,
						schemaDefinition: parsed
					};
				} catch {
					// invalid JSON schema text; omit schemaData
				}
			}
		}

		saving = true;
		try {
			await onSave({
				name: templateName.trim(),
				description: templateDescription.trim(),
				aiQueryData,
				...(currentJsonSchemaId && { jsonSchemaId: currentJsonSchemaId }),
				...(schemaData && { schemaData })
			});
		} catch (err) {
			console.error('Save failed:', err);
			const message = err instanceof Error ? err.message : 'Failed to save';
			const hint = message.includes('enum') || message.includes('AIModel')
				? ' The selected AI model may not be in the deployed API schema yet—try redeploying or pick another model.'
				: '';
			alert(message + hint);
		} finally {
			saving = false;
		}
	}

	function handleCancel() {
		onCancel?.();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			handleCancel();
		}
	}
</script>

{#if template || isCreating}
{@const inputCls = `w-full px-3 py-2 text-sm rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 ${darkMode ? 'bg-slate-800/80 text-white border-slate-600/80 placeholder-slate-500' : 'bg-white text-slate-900 border-slate-200 placeholder-slate-400'}`}
{@const labelCls = `block text-[11px] font-medium uppercase tracking-wider mb-1.5 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}

<div
	class="fixed inset-0 bg-black/50 backdrop-blur-[2px] flex items-start justify-center z-50 pt-[3vh] pb-[3vh] overflow-y-auto"
	onclick={handleCancel}
	onkeydown={handleKeydown}
	role="dialog"
	aria-modal="true"
	aria-labelledby="modal-title"
	tabindex="-1"
>
	<div
		class="w-full max-w-3xl mx-4 {darkMode ? 'bg-slate-900 border-slate-700/50' : 'bg-white border-slate-200/80'} rounded-2xl shadow-2xl border flex flex-col max-h-[94vh]"
		onclick={(e) => e.stopPropagation()}
		onkeydown={(e) => e.stopPropagation()}
		role="presentation"
	>
		<!-- ═══ Sticky Header ═══ -->
		<div class="shrink-0 flex items-center justify-between px-6 py-3.5 border-b {darkMode ? 'border-slate-700/50' : 'border-slate-200/80'}">
			<div class="flex items-center gap-3 min-w-0">
				<div class="w-8 h-8 rounded-lg shrink-0 {darkMode ? 'bg-indigo-500/15' : 'bg-indigo-50'} flex items-center justify-center">
					<svg class="w-4 h-4 {darkMode ? 'text-indigo-400' : 'text-indigo-600'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
					</svg>
				</div>
				<h2 id="modal-title" class="text-sm font-semibold truncate {darkMode ? 'text-white' : 'text-slate-900'}">
					{isCreating ? 'New Prompt' : 'Edit Prompt'}
				</h2>
			</div>
			<div class="flex items-center gap-2 shrink-0">
				<button
					type="button"
					onclick={handleSave}
					disabled={saving || !templateName.trim()}
					class="px-4 py-1.5 text-xs font-semibold rounded-lg transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed
						{darkMode ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}"
				>
					{saving ? 'Saving...' : 'Save'}
				</button>
				<button
					type="button"
					onclick={handleCancel}
					class="p-1.5 rounded-lg transition-colors {darkMode ? 'text-slate-500 hover:text-white hover:bg-slate-700/80' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}"
					aria-label="Close"
				>
					<svg class="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
				</button>
			</div>
		</div>

		<!-- ═══ Scrollable Body ═══ -->
		<div class="flex-1 overflow-y-auto px-6 py-5 space-y-6">

			<!-- ── Section: AI Generate (new prompts only) ── -->
			{#if isCreating && queryClient}
				<div class="rounded-xl border {darkMode ? 'border-violet-500/20 bg-violet-500/5' : 'border-violet-200/80 bg-violet-50/40'} overflow-hidden">
					<div class="px-4 pt-3 pb-1 flex items-center gap-2">
						<svg class="w-3.5 h-3.5 {darkMode ? 'text-violet-400' : 'text-violet-500'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
						</svg>
						<span class="text-[11px] font-semibold uppercase tracking-wider {darkMode ? 'text-violet-400' : 'text-violet-500'}">
							Generate with AI
						</span>
					</div>
					<div class="px-4 pb-4 pt-1 space-y-2">
						<textarea
							bind:value={aiGenerateDescription}
							placeholder="Describe what you want to extract, e.g. 'Get property address, square footage, lease terms, and tenant info from offering memorandums'"
							class="w-full px-3 py-2 text-sm rounded-lg border resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500 {darkMode ? 'bg-slate-800/80 text-white border-slate-600/80 placeholder-slate-500' : 'bg-white text-slate-900 border-slate-200 placeholder-slate-400'}"
							rows="2"
							disabled={aiGenerating}
						></textarea>
						<div class="flex items-center gap-2">
							<button
								type="button"
								onclick={handleAiGenerate}
								disabled={aiGenerating || !aiGenerateDescription.trim()}
								class="px-3 py-1.5 text-xs font-semibold rounded-lg transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed
									{darkMode ? 'bg-violet-600 hover:bg-violet-500 text-white' : 'bg-violet-600 hover:bg-violet-700 text-white'}"
							>
								{#if aiGenerating}
									<span class="inline-flex items-center gap-1.5">
										<svg class="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" /><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
										Generating...
									</span>
								{:else}
									Generate
								{/if}
							</button>
							{#if aiGenerateError}
								<span class="text-xs {darkMode ? 'text-red-400' : 'text-red-500'}">{aiGenerateError}</span>
							{/if}
						</div>
					</div>
				</div>
			{/if}

			<!-- ── Section: Identity ── -->
			<div class="space-y-3">
				<div class="grid grid-cols-1 sm:grid-cols-[2fr_1fr] gap-3">
					<div>
						<label for="template-name" class={labelCls}>Name <span class="text-red-400">*</span></label>
						<input id="template-name" type="text" bind:value={templateName} placeholder="e.g. Property Location Details" class={inputCls} />
					</div>
					<div>
						<label for="template-description" class={labelCls}>Description</label>
						<input id="template-description" type="text" bind:value={templateDescription} placeholder="What this prompt does" class={inputCls} />
					</div>
				</div>
			</div>

			<!-- ── Section: Prompt ── -->
			<div class="rounded-xl border {darkMode ? 'border-slate-700/50 bg-slate-800/30' : 'border-slate-200/80 bg-slate-50/50'} overflow-hidden">
				<div class="px-4 pt-3 pb-1">
					<label for="ai-user-prompt" class="text-[11px] font-semibold uppercase tracking-wider {darkMode ? 'text-slate-400' : 'text-slate-500'}">
						Prompt
					</label>
				</div>
				<div class="px-4 pb-4">
					<textarea
						id="ai-user-prompt"
						bind:value={aiQueryPrompt}
						placeholder="e.g. Extract the property location details such as address, city, state, zip code..."
						class="w-full px-0 py-2 text-sm border-0 resize-none focus:outline-none focus:ring-0 {darkMode ? 'bg-transparent text-white placeholder-slate-600' : 'bg-transparent text-slate-900 placeholder-slate-400'}"
						rows="4"
					></textarea>
					{#if promptInputVariables.length > 0}
						<div class="flex items-center gap-1.5 flex-wrap pt-2 border-t {darkMode ? 'border-slate-700/40' : 'border-slate-200/60'}">
							<span class="text-[10px] uppercase tracking-wider font-semibold {darkMode ? 'text-slate-600' : 'text-slate-400'}">Variables</span>
							{#each promptInputVariables as { syntax }}
								<span class="px-1.5 py-0.5 rounded text-[10px] font-mono {darkMode ? 'bg-amber-500/10 text-amber-400/90 border border-amber-500/20' : 'bg-amber-50 text-amber-600 border border-amber-200/80'}">{syntax}</span>
							{/each}
						</div>
					{/if}
				</div>
			</div>

			<!-- ── Section: Response Fields ── -->
			<div>
				<div class="flex items-center justify-between mb-3">
					<div class="flex items-center gap-2.5">
						<span class="text-[11px] font-semibold uppercase tracking-wider {darkMode ? 'text-slate-400' : 'text-slate-500'}">Response Format</span>
						<select
							bind:value={responseFormatType}
							class="text-xs rounded-lg border px-3 py-1 min-w-[9rem] {darkMode ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-white text-slate-500 border-slate-200'} focus:outline-none focus:ring-1 focus:ring-indigo-500"
						>
							<option value="json_schema">Structured</option>
							<option value="text">Plain text</option>
							<option value="json_object">JSON object</option>
						</select>
					</div>
					{#if responseFormatType === 'json_schema'}
						<div class="flex gap-1.5">
							{#if queryClient}
								<button type="button" onclick={() => showSchemaPicker = true}
									class="px-2.5 py-1 text-[11px] font-medium rounded-lg transition-colors {darkMode ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200/60'}"
								>Pick from Library</button>
							{/if}
							<button type="button" onclick={() => addSchemaField(true)}
								class="px-2.5 py-1 text-[11px] font-medium rounded-lg transition-colors {darkMode ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20' : 'bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-200/60'}"
							>+ Reasoning</button>
							<button type="button" onclick={() => addSchemaField(false)}
								class="px-2.5 py-1 text-[11px] font-medium rounded-lg transition-colors {darkMode ? 'bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/20' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-200/60'}"
							>+ Field</button>
							<button type="button" onclick={() => { showPasteJson = !showPasteJson; pasteJsonError = ''; }}
								class="px-2.5 py-1 text-[11px] font-medium rounded-lg transition-colors {darkMode ? 'bg-slate-500/10 text-slate-400 hover:bg-slate-500/20 border border-slate-500/20' : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-200/60'}"
							>{showPasteJson ? 'Cancel Paste' : 'Paste JSON'}</button>
						</div>
					{/if}
				</div>

			{#if responseFormatType === 'json_schema'}
				{#if showPasteJson}
					<div class="rounded-xl border {darkMode ? 'border-slate-600/60 bg-slate-800/40' : 'border-slate-200 bg-slate-50'} p-3 space-y-2">
						<textarea
							bind:value={pasteJsonText}
							placeholder={'Paste a JSON Schema here, e.g.\n{\n  "type": "object",\n  "properties": {\n    "address": { "type": "string", "description": "Property address" }\n  },\n  "required": ["address"],\n  "additionalProperties": false\n}'}
							class="w-full px-3 py-2 text-xs font-mono rounded-lg border resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 {darkMode ? 'bg-slate-900/60 text-slate-300 border-slate-700/60 placeholder-slate-600' : 'bg-white text-slate-800 border-slate-200 placeholder-slate-400'}"
							rows="6"
						></textarea>
						<div class="flex items-center gap-2">
							<button
								type="button"
								onclick={handlePasteJsonApply}
								disabled={!pasteJsonText.trim()}
								class="px-3 py-1 text-[11px] font-semibold rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed
									{darkMode ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}"
							>Apply Schema</button>
							{#if pasteJsonError}
								<span class="text-[11px] {darkMode ? 'text-red-400' : 'text-red-500'}">{pasteJsonError}</span>
							{/if}
						</div>
					</div>
				{/if}

				<div class="space-y-2">
					{#each orderedFieldEntries as [fieldName, fieldSchema] (fieldName)}
							<div class="rounded-xl border {darkMode ? 'border-slate-700/50 bg-slate-800/30' : 'border-slate-200/80 bg-white'} overflow-hidden">
								<div class="px-3.5 py-2.5">
									<!-- Field header row -->
									<div class="flex items-center gap-2">
										{#key fieldName}
											<input
												type="text"
												value={fieldName}
												onblur={(e) => { const n = e.currentTarget.value.trim(); if (n && n !== fieldName) updateFieldName(fieldName, n); else if (!n) e.currentTarget.value = fieldName; }}
												onkeydown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
												class="flex-1 min-w-0 px-2 py-1 text-sm font-semibold rounded-md border bg-transparent {darkMode ? 'border-transparent text-white hover:border-slate-600 focus:border-indigo-500' : 'border-transparent text-slate-900 hover:border-slate-200 focus:border-indigo-500'} focus:outline-none transition-colors"
												placeholder="field_name"
											/>
										{/key}
										<select
											value={fieldSchema.type || 'string'}
											onchange={(e) => updateSchemaFieldType(fieldName, e.currentTarget.value)}
											class="text-[11px] rounded-md border px-1.5 py-1 {darkMode ? 'bg-slate-700/60 text-slate-400 border-slate-600/60' : 'bg-slate-50 text-slate-500 border-slate-200'} focus:outline-none"
										>
											<option value="string">string</option>
											<option value="number">number</option>
											<option value="integer">integer</option>
											<option value="boolean">boolean</option>
											<option value="array">array</option>
											<option value="object">object</option>
										</select>
										<button
											type="button"
											onclick={() => toggleSchemaFieldRequired(fieldName)}
											class="px-2 py-0.5 text-[10px] font-bold rounded-md uppercase tracking-wide transition-all
												{schemaRequired.includes(fieldName)
													? darkMode ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25' : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
													: darkMode ? 'bg-transparent text-slate-600 border border-slate-700' : 'bg-transparent text-slate-300 border border-slate-200'}"
										>Req</button>
										<button type="button" onclick={() => removeSchemaField(fieldName)}
											class="p-1 rounded-md transition-colors {darkMode ? 'text-slate-600 hover:text-red-400 hover:bg-red-500/10' : 'text-slate-300 hover:text-red-500 hover:bg-red-50'}"
											title="Remove field"
										>
											<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
										</button>
									</div>
									<!-- Description (required) -->
									<div class="mt-2">
										<textarea
											value={fieldSchema.description || ''}
											oninput={(e) => updateSchemaField(fieldName, { description: e.currentTarget.value })}
											placeholder="Description required — what should the AI extract for this field?"
											class="w-full px-2 py-1.5 text-xs rounded-md border resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500/40
												{!fieldSchema.description?.trim()
													? darkMode ? 'bg-red-500/5 border-red-500/30 text-slate-300 placeholder-red-400/60' : 'bg-red-50/50 border-red-200/80 text-slate-600 placeholder-red-300'
													: darkMode ? 'bg-slate-900/40 border-slate-700/40 text-slate-300 placeholder-slate-600' : 'bg-slate-50/80 border-slate-100 text-slate-600 placeholder-slate-400'}"
											rows="1"
										></textarea>
									</div>
									<!-- Type-specific options -->
									{#if fieldSchema.type === 'string'}
										{#if fieldSchema.enum}
											<input type="text" value={fieldSchema.enum.join(', ')}
												oninput={(e) => { const v = e.currentTarget.value.trim(); if (v) updateSchemaField(fieldName, { enum: v.split(',').map((s) => s.trim()).filter(Boolean) }); else { const u = { ...fieldSchema }; delete u.enum; updateSchemaField(fieldName, u); }}}
												placeholder="Allowed values: low, medium, high"
												class="mt-2 w-full px-2 py-1.5 text-xs rounded-md border {darkMode ? 'bg-slate-900/40 border-slate-700/40 text-slate-300' : 'bg-slate-50/80 border-slate-100 text-slate-600'} focus:outline-none focus:ring-1 focus:ring-indigo-500/40"
											/>
										{/if}
										<button type="button"
											onclick={() => { if (fieldSchema.enum) { const u = { ...fieldSchema }; delete u.enum; updateSchemaField(fieldName, u); } else { updateSchemaField(fieldName, { enum: [] }); }}}
											class="mt-1.5 text-[10px] font-medium {darkMode ? 'text-slate-600 hover:text-slate-400' : 'text-slate-400 hover:text-slate-500'} transition-colors"
										>{fieldSchema.enum ? 'Remove allowed values' : '+ Restrict to allowed values'}</button>
									{/if}
									{#if fieldSchema.type === 'number' || fieldSchema.type === 'integer'}
										<div class="mt-2 grid grid-cols-2 gap-2">
											<input type="number" value={fieldSchema.minimum ?? ''} oninput={(e) => updateSchemaField(fieldName, e.currentTarget.value ? { minimum: Number(e.currentTarget.value) } : { minimum: undefined })} placeholder="Min" class="px-2 py-1.5 text-xs rounded-md border {darkMode ? 'bg-slate-900/40 border-slate-700/40 text-slate-300' : 'bg-slate-50/80 border-slate-100 text-slate-600'} focus:outline-none focus:ring-1 focus:ring-indigo-500/40" />
											<input type="number" value={fieldSchema.maximum ?? ''} oninput={(e) => updateSchemaField(fieldName, e.currentTarget.value ? { maximum: Number(e.currentTarget.value) } : { maximum: undefined })} placeholder="Max" class="px-2 py-1.5 text-xs rounded-md border {darkMode ? 'bg-slate-900/40 border-slate-700/40 text-slate-300' : 'bg-slate-50/80 border-slate-100 text-slate-600'} focus:outline-none focus:ring-1 focus:ring-indigo-500/40" />
										</div>
									{/if}
									{#if fieldSchema.type === 'object'}
										<div class="mt-3 border-l-2 {darkMode ? 'border-indigo-500/30' : 'border-indigo-200'} pl-3">
											<SchemaNodesEditor nodes={fieldSchema.objectChildren ?? []} {darkMode} {newNestedId} sectionTitle="Nested properties" addButtonLabel="+ Property" onNodesChange={(ch) => updateSchemaField(fieldName, { objectChildren: ch })} />
										</div>
									{/if}
									{#if fieldSchema.type === 'array'}
										{@const item = fieldSchema.itemSchema ?? { type: 'string' }}
										<div class="mt-3 space-y-2 border-l-2 {darkMode ? 'border-indigo-500/30' : 'border-indigo-200'} pl-3">
											<div class="flex items-center gap-2">
												<span class="text-[10px] uppercase tracking-wider font-semibold {darkMode ? 'text-slate-600' : 'text-slate-400'}">Each item</span>
												<select value={item.type} onchange={(e) => { const v = e.currentTarget.value as NestedSchemaNodeType; const next: NestedItemSchema = v === 'object' ? { type: 'object', properties: [] } : v === 'array' ? { type: 'array', items: { type: 'string' } } : { type: v }; updateSchemaField(fieldName, { itemSchema: next }); }}
													class="text-[11px] rounded-md border px-3 py-1 min-w-[7rem] {darkMode ? 'bg-slate-700/60 text-slate-400 border-slate-600/60' : 'bg-slate-50 text-slate-500 border-slate-200'} focus:outline-none"
												>
													<option value="string">string</option><option value="number">number</option><option value="integer">integer</option><option value="boolean">boolean</option><option value="object">object</option><option value="array">array</option>
												</select>
											</div>
											{#if item.type === 'object'}
												<textarea value={item.description ?? ''} oninput={(e) => { const cur = schemaProperties[fieldName]; const it = (cur?.itemSchema ?? { type: 'object', properties: [] }) as NestedItemSchema; updateSchemaField(fieldName, { itemSchema: { ...it, type: 'object', description: e.currentTarget.value } }); }}
													placeholder="Description of each array element"
													class="w-full px-2 py-1.5 text-xs rounded-md border resize-none {darkMode ? 'bg-slate-900/40 border-slate-700/40 text-slate-300' : 'bg-slate-50/80 border-slate-100 text-slate-600'} focus:outline-none focus:ring-1 focus:ring-indigo-500/40" rows="1"
												></textarea>
												<SchemaNodesEditor nodes={item.properties ?? []} {darkMode} {newNestedId} sectionTitle="Item fields" addButtonLabel="+ Field"
													onNodesChange={(props) => { const cur = schemaProperties[fieldName]; const it = (cur?.itemSchema ?? { type: 'object', properties: [] }) as NestedItemSchema; updateSchemaField(fieldName, { itemSchema: { ...it, type: 'object', properties: props } }); }}
												/>
											{:else if item.type === 'array'}
												{@const inner = item.items ?? { type: 'string' }}
												<div class="flex items-center gap-2">
													<span class="text-[10px] uppercase tracking-wider font-semibold {darkMode ? 'text-slate-600' : 'text-slate-400'}">Inner</span>
													<select value={inner.type} onchange={(e) => { const v = e.currentTarget.value as NestedSchemaNodeType; const ni: NestedItemSchema = v === 'object' ? { type: 'object', properties: [] } : v === 'array' ? { type: 'array', items: { type: 'string' } } : { type: v }; updateSchemaField(fieldName, { itemSchema: { ...item, type: 'array', items: ni } }); }}
														class="text-[11px] rounded-md border px-1.5 py-0.5 {darkMode ? 'bg-slate-700/60 text-slate-400 border-slate-600/60' : 'bg-slate-50 text-slate-500 border-slate-200'} focus:outline-none"
													>
														<option value="string">string</option><option value="number">number</option><option value="integer">integer</option><option value="boolean">boolean</option><option value="object">object</option><option value="array">array</option>
													</select>
												</div>
												{#if inner.type === 'object'}
													<textarea value={inner.description ?? ''} oninput={(e) => { const cur = schemaProperties[fieldName]; const it = (cur?.itemSchema ?? { type: 'array', items: inner }) as NestedItemSchema; const inn = (it.items ?? inner) as NestedItemSchema; updateSchemaField(fieldName, { itemSchema: { ...it, type: 'array', items: { ...inn, type: 'object', description: e.currentTarget.value } } }); }}
														class="w-full px-2 py-1.5 text-xs rounded-md border resize-none {darkMode ? 'bg-slate-900/40 border-slate-700/40 text-slate-300' : 'bg-slate-50/80 border-slate-100 text-slate-600'} focus:outline-none focus:ring-1 focus:ring-indigo-500/40" rows="1"
													></textarea>
													<SchemaNodesEditor nodes={inner.properties ?? []} {darkMode} {newNestedId} sectionTitle="Inner fields" addButtonLabel="+ Field"
														onNodesChange={(props) => { const cur = schemaProperties[fieldName]; const it = (cur?.itemSchema ?? { type: 'array', items: inner }) as NestedItemSchema; const inn = (it.items ?? inner) as NestedItemSchema; updateSchemaField(fieldName, { itemSchema: { ...it, type: 'array', items: { ...inn, type: 'object', properties: props } } }); }}
													/>
												{:else if inner.type === 'array'}
													<p class="text-[10px] {darkMode ? 'text-slate-600' : 'text-slate-400'}">Max nesting reached. Use an object with an array field for deeper nesting.</p>
												{/if}
											{/if}
										</div>
									{/if}
								</div>
							</div>
						{/each}

						{#if Object.keys(schemaProperties).length === 0}
							<div class="rounded-xl border-2 border-dashed {darkMode ? 'border-slate-700/60' : 'border-slate-200'} py-8 text-center">
								<p class="text-sm {darkMode ? 'text-slate-500' : 'text-slate-400'}">No fields defined yet</p>
								<p class="text-xs mt-1 {darkMode ? 'text-slate-600' : 'text-slate-300'}">Click <strong>+ Field</strong> above to define what the AI returns</p>
							</div>
						{/if}
					</div>

					<!-- Schema preview toggle -->
					{#if Object.keys(schemaProperties).length > 0}
						<details class="mt-3">
							<summary class="text-[11px] font-medium cursor-pointer select-none {darkMode ? 'text-slate-600 hover:text-slate-400' : 'text-slate-400 hover:text-slate-500'} transition-colors">
								JSON schema preview
							</summary>
							<pre class="mt-2 p-3 rounded-lg text-[10px] leading-relaxed overflow-auto max-h-48 {darkMode ? 'bg-slate-800/60 text-slate-400 border border-slate-700/40' : 'bg-slate-50 text-slate-500 border border-slate-100'}">{JSON.stringify(schemaPreview, null, 2)}</pre>
						</details>
					{/if}
				{/if}
			</div>

			<!-- ── Section: Advanced ── -->
			<details class="group">
				<summary class="flex items-center gap-2 cursor-pointer select-none py-1 {darkMode ? 'text-slate-600 hover:text-slate-400' : 'text-slate-400 hover:text-slate-500'} transition-colors">
					<svg class="w-3 h-3 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
					<span class="text-[11px] font-medium uppercase tracking-wider">Advanced</span>
				</summary>
				<div class="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
					<div>
						<label for="temperature" class={labelCls}>Creativity</label>
						<input type="number" id="temperature" bind:value={temperature} min="0" max="2" step="0.1" placeholder="1.0" class={inputCls} />
					</div>
					<div>
						<label for="max-tokens" class={labelCls}>Max tokens</label>
						<input type="number" id="max-tokens" bind:value={maxTokens} min="1" placeholder="Auto" class={inputCls} />
					</div>
					<div>
						<label for="top-p" class={labelCls}>Diversity</label>
						<input type="number" id="top-p" bind:value={topP} min="0" max="1" step="0.1" placeholder="1.0" class={inputCls} />
					</div>
					<div>
						<label for="frequency-penalty" class={labelCls}>Freq penalty</label>
						<input type="number" id="frequency-penalty" bind:value={frequencyPenalty} min="-2" max="2" step="0.1" placeholder="0" class={inputCls} />
					</div>
				</div>
				<div class="mt-3">
					<label for="stop-sequences" class={labelCls}>Stop sequences</label>
					<input type="text" id="stop-sequences" bind:value={stopSequences} placeholder="e.g. END, [DONE]" class={inputCls} />
				</div>
			</details>
		</div>
	</div>
</div>

{#if showSchemaPicker && queryClient}
	<JsonSchemaPickerModal
		{darkMode}
		{queryClient}
		selectedSchemaId={currentJsonSchemaId}
		onselect={handleSchemaPickerSelect}
		onclose={() => showSchemaPicker = false}
	/>
{/if}
{/if}
