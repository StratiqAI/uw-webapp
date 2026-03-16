<script lang="ts">
	import type { Prompt } from '@stratiqai/types-simple';
	import type { AiModel } from '@stratiqai/types-simple';
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
		onSave,
		onCancel
	}: {
		darkMode?: boolean;
		template?: Prompt | null;
		isCreating?: boolean;
		onSave?: (data: {
			name: string;
			description: string;
			aiQueryData: AIQueryData;
			outputSchema?: { name: string; description?: string; schemaDefinition: unknown };
		}) => void | Promise<void>;
		onCancel?: () => void;
	} = $props();

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
	let responseFormatType = $state<'text' | 'json_object' | 'json_schema' | 'json_schema_nested'>('json_schema');
	let jsonSchemaText = $state('');

	// --- Nested schema editor (improved: root type, arrays, nested objects) ---
	type NestedSchemaNodeType = 'string' | 'number' | 'integer' | 'boolean' | 'object' | 'array';
	interface NestedItemSchema {
		type: NestedSchemaNodeType;
		description?: string;
		enum?: string[];
		minimum?: number;
		maximum?: number;
		properties?: NestedSchemaPropertyNode[];
		items?: NestedItemSchema;
	}
	interface NestedSchemaPropertyNode {
		id: string;
		name: string;
		type: NestedSchemaNodeType;
		required: boolean;
		description: string;
		enum?: string[];
		minimum?: number;
		maximum?: number;
		children?: NestedSchemaPropertyNode[];
		itemSchema?: NestedItemSchema;
	}
	function newNestedId(): string {
		return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `nested_${Date.now()}_${Math.random().toString(36).slice(2)}`;
	}
	let nestedRootType = $state<'object' | 'array' | 'string' | 'number' | 'boolean'>('object');
	let nestedRootProperties = $state<NestedSchemaPropertyNode[]>([]);
	let nestedRootItems = $state<NestedItemSchema>({ type: 'string' });

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

			// Prefer inline outputSchema from Prompt when present; else legacy template-str responseFormat
			if (template.outputSchema?.schemaDefinition != null) {
				const def = template.outputSchema.schemaDefinition;
				const schema = typeof def === 'string' ? (() => { try { return JSON.parse(def); } catch { return {}; } })() : (def as Record<string, unknown>);
				jsonSchemaText = typeof def === 'string' ? def : JSON.stringify(schema, null, 2);

				function isNestedSchema(s: Record<string, unknown>): boolean {
					const t = s.type as string | undefined;
					if (t === 'array') return true;
					if (t === 'object' && s.properties && typeof s.properties === 'object') {
						for (const v of Object.values(s.properties as Record<string, Record<string, unknown>>)) {
							if (v && typeof v === 'object' && (v.properties != null || v.items != null)) return true;
						}
					}
					return false;
				}

				if (schema && typeof schema === 'object' && isNestedSchema(schema)) {
					responseFormatType = 'json_schema_nested';
					jsonSchemaToNestedTree(schema);
				} else {
					responseFormatType = 'json_schema';
					if (schema && typeof schema === 'object' && schema.properties) {
						schemaProperties = { ...(schema.properties as Record<string, any>) };
						schemaRequired = Array.isArray(schema.required) ? [...(schema.required as string[])] : [];
						fieldOrder = Object.keys(schema.properties as Record<string, unknown>);
					} else {
						schemaProperties = {};
						schemaRequired = [];
						fieldOrder = [];
					}
				}
			} else if (data.responseFormat) {
				responseFormatType = data.responseFormat.type;
				if (data.responseFormat.type === 'json_schema' && data.responseFormat.schema) {
					const schema = data.responseFormat.schema as any;
					jsonSchemaText = JSON.stringify(schema, null, 2);
					if (schema.properties) {
						schemaProperties = { ...schema.properties };
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

	let schemaPreview = $derived.by(() => {
		return {
			type: 'object',
			properties: schemaProperties,
			required: schemaRequired,
			additionalProperties: false,
			$schema: 'http://json-schema.org/draft-07/schema#'
		};
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
		if (schemaProperties[fieldName]) {
			const current = schemaProperties[fieldName];
			const updated: any = { type, ...current };
			if (type !== 'string') {
				delete updated.enum;
				delete updated.pattern;
			}
			if (type !== 'number' && type !== 'integer') {
				delete updated.minimum;
				delete updated.maximum;
			}
			updateSchemaField(fieldName, updated);
		}
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
		if (node.type === 'object' && node.children && node.children.length > 0) {
			const properties: Record<string, unknown> = {};
			const required: string[] = [];
			for (const child of node.children) {
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
		if (item.type === 'object' && item.properties && item.properties.length > 0) {
			const properties: Record<string, unknown> = {};
			const required: string[] = [];
			for (const child of item.properties) {
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

	function nestedTreeToJsonSchemaRoot(): Record<string, unknown> {
		if (nestedRootType === 'object') {
			const properties: Record<string, unknown> = {};
			const required: string[] = [];
			for (const node of nestedRootProperties) {
				if (node.name.trim()) {
					properties[node.name.trim()] = nestedNodeToJsonSchema(node);
					if (node.required) required.push(node.name.trim());
				}
			}
			return {
				$schema: 'http://json-schema.org/draft-07/schema#',
				type: 'object',
				properties,
				...(required.length > 0 && { required }),
				additionalProperties: false
			};
		}
		if (nestedRootType === 'array') {
			return {
				$schema: 'http://json-schema.org/draft-07/schema#',
				type: 'array',
				items: nestedItemSchemaToJsonSchema(nestedRootItems)
			};
		}
		return {
			$schema: 'http://json-schema.org/draft-07/schema#',
			type: nestedRootType
		};
	}

	function jsonSchemaToNestedTree(schema: Record<string, unknown>): boolean {
		const type = schema.type as string | undefined;
		if (type === 'array') {
			nestedRootType = 'array';
			const items = schema.items as Record<string, unknown> | undefined;
			nestedRootItems = items ? jsonSchemaToItemSchema(items) : { type: 'string' };
			return true;
		}
		if (type === 'object') {
			nestedRootType = 'object';
			const props = schema.properties as Record<string, Record<string, unknown>> | undefined;
			const required = (schema.required as string[]) || [];
			nestedRootProperties = props
				? Object.entries(props).map(([name, def]) => jsonSchemaToPropertyNode(newNestedId(), name, def, required.includes(name)))
				: [];
			return true;
		}
		if (type === 'string' || type === 'number' || type === 'integer' || type === 'boolean') {
			nestedRootType = type === 'integer' ? 'number' : (type as 'string' | 'number' | 'boolean');
			nestedRootProperties = [];
			return true;
		}
		return false;
	}

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

	let nestedSchemaPreview = $derived(nestedTreeToJsonSchemaRoot());

	function updateNestedNodeById(nodeId: string, patch: Partial<NestedSchemaPropertyNode>): void {
		function updateIn(list: NestedSchemaPropertyNode[]): boolean {
			for (let i = 0; i < list.length; i++) {
				if (list[i].id === nodeId) {
					list[i] = { ...list[i], ...patch };
					return true;
				}
				const children = list[i].children;
				if (children != null && updateIn(children)) return true;
			}
			return false;
		}
		updateIn(nestedRootProperties);
		nestedRootProperties = [...nestedRootProperties];
	}

	function addNestedChildTo(parentId: string | null): void {
		const newNode: NestedSchemaPropertyNode = {
			id: newNestedId(),
			name: '',
			type: 'string',
			required: false,
			description: ''
		};
		if (parentId === null) {
			nestedRootProperties = [...nestedRootProperties, newNode];
			return;
		}
		function addIn(list: NestedSchemaPropertyNode[]): boolean {
			for (let i = 0; i < list.length; i++) {
				if (list[i].id === parentId) {
					list[i].children = [...(list[i].children ?? []), newNode];
					return true;
				}
				const children = list[i].children;
				if (children != null && addIn(children)) return true;
			}
			return false;
		}
		addIn(nestedRootProperties);
		nestedRootProperties = [...nestedRootProperties];
	}

	function removeNestedNodeById(nodeId: string): void {
		function removeFrom(list: NestedSchemaPropertyNode[]): boolean {
			for (let i = 0; i < list.length; i++) {
				if (list[i].id === nodeId) {
					list.splice(i, 1);
					return true;
				}
				const children = list[i].children;
				if (children != null && removeFrom(children)) return true;
			}
			return false;
		}
		removeFrom(nestedRootProperties);
		nestedRootProperties = [...nestedRootProperties];
	}

	function setNestedRootItemsType(type: NestedSchemaNodeType): void {
		if (type === 'object') {
			nestedRootItems = { type: 'object', properties: [] };
		} else if (type === 'array') {
			nestedRootItems = { type: 'array', items: { type: 'string' } };
		} else {
			nestedRootItems = { type, description: nestedRootItems.description };
		}
	}

	function addNestedRootItemProperty(): void {
		if (nestedRootItems.type !== 'object') return;
		const list = nestedRootItems.properties || [];
		nestedRootItems = {
			...nestedRootItems,
			properties: [...list, { id: newNestedId(), name: '', type: 'string', required: false, description: '' }]
		};
	}

	function updateNestedRootItemProperty(id: string, patch: Partial<NestedSchemaPropertyNode>): void {
		if (nestedRootItems.type !== 'object' || !nestedRootItems.properties) return;
		const props = nestedRootItems.properties.map((p) => (p.id === id ? { ...p, ...patch } : p));
		nestedRootItems = { ...nestedRootItems, properties: props };
	}

	function removeNestedRootItemProperty(id: string): void {
		if (nestedRootItems.type !== 'object' || !nestedRootItems.properties) return;
		nestedRootItems = { ...nestedRootItems, properties: nestedRootItems.properties.filter((p) => p.id !== id) };
	}

	function updateNestedItemSchemaItems(items: NestedItemSchema): void {
		nestedRootItems = { ...nestedRootItems, items };
	}

	async function handleSave() {
		if (!templateName.trim()) {
			alert('Please enter a template name');
			return;
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

		let outputSchema: { name: string; description?: string; schemaDefinition: unknown } | undefined;
		if (responseFormatType === 'json_schema') {
			if (Object.keys(schemaProperties).length > 0) {
				outputSchema = {
					name: templateName.trim() || 'Structured output',
					description: templateDescription.trim() || undefined,
					schemaDefinition: schemaPreview
				};
			} else if (jsonSchemaText.trim()) {
				try {
					const parsed = JSON.parse(jsonSchemaText);
					outputSchema = {
						name: templateName.trim() || 'Structured output',
						description: templateDescription.trim() || undefined,
						schemaDefinition: parsed
					};
				} catch {
					// invalid JSON schema; omit outputSchema
				}
			}
		} else if (responseFormatType === 'json_schema_nested') {
			outputSchema = {
				name: templateName.trim() || 'Structured output',
				description: templateDescription.trim() || undefined,
				schemaDefinition: nestedTreeToJsonSchemaRoot()
			};
		}

		saving = true;
		try {
			await onSave({
				name: templateName.trim(),
				description: templateDescription.trim(),
				aiQueryData,
				...(outputSchema && { outputSchema })
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
	<div
		class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
		onclick={handleCancel}
		onkeydown={handleKeydown}
		role="dialog"
		aria-modal="true"
		aria-labelledby="modal-title"
		tabindex="-1"
	>
		<div
			class="{darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto m-4 border"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
			role="presentation"
		>
			<div class="p-6">
				<!-- Header -->
				<div class="flex items-center gap-3 mb-6 pb-4 {darkMode ? 'border-slate-700' : 'border-slate-200'} border-b">
					<div class="w-10 h-10 {darkMode ? 'bg-indigo-900' : 'bg-indigo-100'} rounded-lg flex items-center justify-center">
						<span class="{darkMode ? 'text-indigo-300' : 'text-indigo-600'} font-bold text-sm">AI</span>
					</div>
					<div>
						<h2 id="modal-title" class="text-xl font-semibold {darkMode ? 'text-white' : 'text-slate-900'}">
							{isCreating ? 'Create new prompt' : 'Edit prompt'}
						</h2>
						<p class="text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'} mt-0.5">Describe what you want the AI to do and how you want the answer</p>
					</div>
				</div>

				<div class="space-y-5">
					<!-- Template Name -->
					<div>
						<label for="template-name" class="block text-sm font-semibold {darkMode ? 'text-slate-200' : 'text-slate-700'} mb-2">
						Name <span class="text-red-500">*</span>
						</label>
						<input
							id="template-name"
							type="text"
							bind:value={templateName}
							placeholder="e.g. Property summary, Market overview"
							class="w-full px-3 py-2.5 {darkMode ? 'bg-slate-700 text-white border-slate-600 placeholder-slate-500' : 'bg-white text-slate-900 border-slate-300'} rounded-md border focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
						/>
					</div>

					<!-- Template Description -->
					<div>
						<label for="template-description" class="block text-sm font-semibold {darkMode ? 'text-slate-200' : 'text-slate-700'} mb-2">
							Description
						</label>
						<input
							id="template-description"
							type="text"
							bind:value={templateDescription}
							placeholder="Short description of what this prompt does"
							class="w-full px-3 py-2.5 {darkMode ? 'bg-slate-700 text-white border-slate-600 placeholder-slate-500' : 'bg-white text-slate-900 border-slate-300'} rounded-md border focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
						/>
					</div>

					<hr class="{darkMode ? 'border-slate-700' : 'border-slate-200'}" />

					<!-- User Prompt -->
					<div>
						<label for="ai-user-prompt" class="block text-sm font-semibold {darkMode ? 'text-slate-200' : 'text-slate-700'} mb-2">
							What to ask
						</label>

						<!-- Input variables: show what placeholders this prompt expects -->
						{#if promptInputVariables.length > 0}
							<div
								class="mb-3 rounded-lg border p-3 {darkMode ? 'border-amber-500/40 bg-amber-950/20' : 'border-amber-300 bg-amber-50/80'}"
								role="region"
								aria-label="Spots to fill in when you run this prompt"
							>
								<p class="text-xs font-medium uppercase tracking-wider mb-2 {darkMode ? 'text-amber-400/90' : 'text-amber-700'}">
									Spots to fill in later
									<span class="ml-1.5 font-normal normal-case {darkMode ? 'text-amber-500/70' : 'text-amber-600'}">({promptInputVariables.length})</span>
								</p>
								<div class="flex flex-wrap gap-2">
									{#each promptInputVariables as { name, syntax }}
										<div
											class="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium {darkMode ? 'bg-slate-700/80 text-amber-200 border border-slate-600' : 'bg-white text-amber-900 border border-amber-200 shadow-sm'}"
											title="Used as {syntax} in your prompt"
										>
											<svg class="size-3.5 shrink-0 {darkMode ? 'text-amber-500' : 'text-amber-600'}" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
											</svg>
											<span class="font-mono text-xs">{syntax}</span>
										</div>
									{/each}
								</div>
								<p class="text-xs mt-2 {darkMode ? 'text-slate-400' : 'text-slate-500'}">
									These will be filled in when you run this. In your text below, use {'{{'}name{'}}'} or {'{'}name{'}'} for each one.
								</p>
							</div>
						{/if}

						<textarea
							id="ai-user-prompt"
							bind:value={aiQueryPrompt}
							placeholder="e.g. Summarize the key points from: {'{input}'}"
							class="w-full px-3 py-2.5 {darkMode ? 'bg-slate-700 text-white border-slate-600 placeholder-slate-500' : 'bg-white text-slate-900 border-slate-300'} rounded-md border focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none text-sm"
							rows="5"
						></textarea>
						<p class="text-xs {darkMode ? 'text-slate-400' : 'text-slate-500'} mt-1.5">Use {'{input}'} or {'{{'}name{'}}'} to plug in data when you run this</p>
					</div>

					<!-- Response Format -->
					<div>
						<h3 class="text-xs font-semibold {darkMode ? 'text-slate-400' : 'text-slate-500'} uppercase tracking-wide mb-3">
							How should the AI answer?
						</h3>
						<div>
							<label for="response-format" class="block text-sm font-medium {darkMode ? 'text-slate-300' : 'text-slate-700'} mb-1.5">
								Answer format
							</label>
							<select
								id="response-format"
								bind:value={responseFormatType}
								class="w-full px-3 py-2 {darkMode ? 'bg-slate-700 text-white border-slate-600' : 'bg-white text-slate-900 border-slate-300'} rounded-md border focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
							>
								<option value="json_schema">Structured form (define fields) — default</option>
								<option value="json_schema_nested">Structured form (nested)</option>
								<option value="text">Plain text</option>
								<option value="json_object">Structured list</option>
							</select>
						</div>
						{#if responseFormatType === 'json_schema' || responseFormatType === 'json_schema_nested'}
							<div class="mt-3 space-y-3">
								{#if responseFormatType === 'json_schema_nested'}
									<div class="rounded-md border {darkMode ? 'border-teal-600 bg-teal-900/30' : 'border-teal-300 bg-teal-50'} p-4">
										<div class="mb-4">
											<label for="nested-root-type" class="mb-2 block text-sm font-medium {darkMode ? 'text-slate-200' : 'text-slate-700'}">Type of Output</label>
											<select
												id="nested-root-type"
												bind:value={nestedRootType}
												class="w-full rounded border {darkMode ? 'border-gray-600 bg-slate-700 text-slate-100' : 'border-gray-200 bg-white text-slate-900'} px-2 py-1.5 text-sm"
											>
												<option value="object">Object</option>
												<option value="array">Array</option>
												<option value="string">String</option>
												<option value="number">Number</option>
												<option value="boolean">Boolean</option>
											</select>
										</div>
										{#if nestedRootType === 'object'}
											<div class="mb-4">
												<div class="mb-2 flex items-center justify-between">
													<span class="block text-sm font-medium {darkMode ? 'text-slate-200' : 'text-slate-700'}">Properties</span>
													<button
														type="button"
														onclick={() => addNestedChildTo(null)} class="rounded bg-teal-600 px-3 py-1 text-xs text-white hover:bg-teal-700"
													>
														+ Add Property
													</button>
												</div>
												<div class="space-y-3">
													{#each nestedRootProperties as node (node.id)}
														{@const isObject = node.type === 'object'}
														{@const isArray = node.type === 'array'}
														<div class="rounded border {darkMode ? 'border-gray-600 bg-slate-800' : 'border-gray-300 bg-white'} p-3">
															<div class="mb-2 flex flex-wrap items-center gap-2">
																<input
																	type="text"
																	value={node.name}
																	oninput={(e) => updateNestedNodeById(node.id, { name: e.currentTarget.value })}
																	class="flex-1 min-w-24 rounded border {darkMode ? 'border-gray-600 bg-slate-700 text-slate-100' : 'border-gray-200 bg-white text-slate-900'} px-2 py-1 text-sm"
																	placeholder="Property name"
																/>
																<select
																	value={node.type}
																	onchange={(e) => {
																		const v = e.currentTarget.value as NestedSchemaNodeType;
																		updateNestedNodeById(node.id, {
																			type: v,
																			children: v === 'object' ? [] : undefined,
																			itemSchema: v === 'array' ? { type: 'string' } : undefined
																		});
																	}}
																	class="rounded border {darkMode ? 'border-gray-600 bg-slate-700 text-slate-100' : 'border-gray-200 bg-white text-slate-900'} px-2 py-1 text-sm"
																>
																	<option value="string">String</option>
																	<option value="number">Number</option>
																	<option value="integer">Integer</option>
																	<option value="boolean">Boolean</option>
																	<option value="object">Object</option>
																	<option value="array">Array</option>
																</select>
																<label class="flex cursor-pointer items-center gap-1 text-sm {darkMode ? 'text-slate-200' : 'text-slate-700'}">
																	<input
																		type="checkbox"
																		checked={node.required}
																		onchange={(e) => updateNestedNodeById(node.id, { required: e.currentTarget.checked })}
																		class="cursor-pointer"
																	/>
																	Required
																</label>
																<button
																	type="button"
																	onclick={() => removeNestedNodeById(node.id)} class="rounded bg-red-500 px-2 py-1 text-xs text-white hover:bg-red-600"
																>
																	Remove
																</button>
															</div>
															<div class="mb-2">
																<div class="mb-1 block text-xs font-medium {darkMode ? 'text-slate-300' : 'text-gray-700'}">Extraction Description</div>
																<textarea
																	value={node.description}
																	oninput={(e) => updateNestedNodeById(node.id, { description: e.currentTarget.value })}
																	placeholder="Describe this property..."
																	class="w-full rounded border {darkMode ? 'border-gray-600 bg-slate-700 text-slate-100' : 'border-gray-200 bg-white text-slate-900'} px-2 py-1 text-xs"
																	rows="2"
																></textarea>
															</div>
															{#if isObject}
																<div class="ml-4 mt-2 rounded border {darkMode ? 'border-gray-600' : 'border-gray-300'} border-dashed p-2">
																	<div class="mb-2 flex items-center justify-between">
																		<span class="text-xs font-medium {darkMode ? 'text-slate-400' : 'text-slate-600'}">Nested properties</span>
																		<button type="button" onclick={() => addNestedChildTo(node.id)} class="rounded bg-teal-600 px-2 py-1 text-xs text-white hover:bg-teal-700">+ Add Property</button>
																	</div>
																	{#each node.children || [] as child (child.id)}
																		<div class="mb-2 rounded border {darkMode ? 'border-gray-600 bg-slate-800' : 'border-gray-200 bg-white'} p-2">
																			<div class="mb-1 flex flex-wrap items-center gap-2">
																				<input type="text" value={child.name} oninput={(e) => updateNestedNodeById(child.id, { name: e.currentTarget.value })} class="min-w-20 rounded border {darkMode ? 'border-gray-600 bg-slate-700 text-slate-100' : 'border-gray-200 bg-white text-slate-900'} px-2 py-1 text-xs" placeholder="Name" />
																				<select value={child.type} onchange={(e) => { const v = e.currentTarget.value as NestedSchemaNodeType; updateNestedNodeById(child.id, { type: v, children: v === 'object' ? [] : undefined, itemSchema: v === 'array' ? { type: 'string' } : undefined }); }} class="rounded border {darkMode ? 'border-gray-600 bg-slate-700 text-slate-100' : 'border-gray-200 bg-white text-slate-900'} px-2 py-1 text-xs">
																					<option value="string">String</option><option value="number">Number</option><option value="integer">Integer</option><option value="boolean">Boolean</option><option value="object">Object</option><option value="array">Array</option>
																				</select>
																				<label class="flex items-center gap-1 text-xs {darkMode ? 'text-slate-300' : 'text-slate-600'}"><input type="checkbox" checked={child.required} onchange={(e) => updateNestedNodeById(child.id, { required: e.currentTarget.checked })} class="cursor-pointer" />Required</label>
																				<button type="button" onclick={() => removeNestedNodeById(child.id)} class="rounded bg-red-500 px-2 py-0.5 text-xs text-white hover:bg-red-600">Remove</button>
																			</div>
																			<textarea value={child.description} oninput={(e) => updateNestedNodeById(child.id, { description: e.currentTarget.value })} placeholder="Description" class="w-full rounded border {darkMode ? 'border-gray-600 bg-slate-700 text-slate-100' : 'border-gray-200 bg-white text-slate-900'} px-2 py-1 text-xs" rows="1"></textarea>
																			{#if child.type === 'object' && (child.children?.length ?? 0) > 0}
																				<div class="ml-2 mt-1 border-l-2 {darkMode ? 'border-teal-700' : 'border-teal-300'} pl-2">
																					{#each child.children as sub (sub.id)}
																						<div class="mb-1 flex items-center gap-2 text-xs">
																							<input type="text" value={sub.name} oninput={(e) => updateNestedNodeById(sub.id, { name: e.currentTarget.value })} class="rounded border px-2 py-0.5 w-24" placeholder="Name" />
																							<select value={sub.type} onchange={(e) => { const v = e.currentTarget.value as NestedSchemaNodeType; updateNestedNodeById(sub.id, { type: v, children: v === 'object' ? [] : undefined, itemSchema: v === 'array' ? { type: 'string' } : undefined }); }} class="rounded border px-2 py-0.5"><option value="string">String</option><option value="number">Number</option><option value="integer">Integer</option><option value="boolean">Boolean</option><option value="object">Object</option><option value="array">Array</option></select>
																							<button type="button" onclick={() => removeNestedNodeById(sub.id)} class="text-red-500 hover:underline">Remove</button>
																						</div>
																					{/each}
																					<button type="button" onclick={() => addNestedChildTo(child.id)} class="text-xs text-teal-600 hover:underline">+ Add</button>
																				</div>
																			{/if}
																		</div>
																	{/each}
																</div>
															{/if}
															{#if isArray && node.itemSchema}
																<div class="ml-4 mt-2 rounded border {darkMode ? 'border-gray-600' : 'border-gray-300'} border-dashed p-2">
																	<span class="mb-1 block text-xs font-medium {darkMode ? 'text-slate-400' : 'text-slate-600'}">Item type</span>
																	<select
																		value={node.itemSchema.type}
																		onchange={(e) => {
																			const v = e.currentTarget.value as NestedSchemaNodeType;
																			updateNestedNodeById(node.id, { itemSchema: v === 'object' ? { type: 'object', properties: [] } : v === 'array' ? { type: 'array', items: { type: 'string' } } : { type: v } });
																		}}
																		class="rounded border {darkMode ? 'border-gray-600 bg-slate-700 text-slate-100' : 'border-gray-200 bg-white text-slate-900'} px-2 py-1 text-xs"
																	>
																		<option value="string">String</option><option value="number">Number</option><option value="integer">Integer</option><option value="boolean">Boolean</option><option value="object">Object</option><option value="array">Array</option>
																	</select>
																	{#if node.itemSchema.type === 'object' && node.itemSchema.properties}
																		<div class="mt-2">
																			<button type="button" onclick={() => { const list = node.itemSchema!.properties || []; updateNestedNodeById(node.id, { itemSchema: { ...node.itemSchema!, properties: [...list, { id: newNestedId(), name: '', type: 'string', required: false, description: '' }] } }); }} class="rounded bg-teal-600 px-2 py-1 text-xs text-white hover:bg-teal-700">+ Add item property</button>
																			{#each node.itemSchema.properties as ip (ip.id)}
																				<div class="mt-1 flex items-center gap-2 text-xs">
																					<input type="text" value={ip.name} oninput={(e) => { const list = node.itemSchema!.properties || []; const next = list.map(p => p.id === ip.id ? { ...p, name: e.currentTarget.value } : p); updateNestedNodeById(node.id, { itemSchema: { ...node.itemSchema!, properties: next } }); }} class="rounded border px-2 py-0.5 w-24" placeholder="Name" />
																					<select value={ip.type} onchange={(e) => { const v = e.currentTarget.value as NestedSchemaNodeType; const list = node.itemSchema!.properties || []; const next = list.map(p => p.id === ip.id ? { ...p, type: v, children: v === 'object' ? [] : undefined, itemSchema: v === 'array' ? ({ type: 'string' } as NestedItemSchema) : undefined } : p); updateNestedNodeById(node.id, { itemSchema: { ...node.itemSchema!, properties: next } }); }} class="rounded border px-2 py-0.5"><option value="string">String</option><option value="number">Number</option><option value="integer">Integer</option><option value="boolean">Boolean</option><option value="object">Object</option><option value="array">Array</option></select>
																					<button type="button" onclick={() => { const list = (node.itemSchema!.properties || []).filter(p => p.id !== ip.id); updateNestedNodeById(node.id, { itemSchema: { ...node.itemSchema!, properties: list } }); }} class="text-red-500 hover:underline">Remove</button>
																				</div>
																			{/each}
																		</div>
																	{/if}
																</div>
															{/if}
														</div>
													{/each}
													{#if nestedRootProperties.length === 0}
														<p class="text-sm {darkMode ? 'text-gray-400' : 'text-gray-500'}">No properties. Click “+ Add Property” to define the output shape.</p>
													{/if}
												</div>
											</div>
										{:else if nestedRootType === 'array'}
											<div class="mb-4">
												<label for="nested-root-items-type" class="mb-2 block text-sm font-medium {darkMode ? 'text-slate-200' : 'text-slate-700'}">Item type</label>
												<select
													id="nested-root-items-type"
													value={nestedRootItems.type}
													onchange={(e) => setNestedRootItemsType(e.currentTarget.value as NestedSchemaNodeType)}
													class="w-full rounded border {darkMode ? 'border-gray-600 bg-slate-700 text-slate-100' : 'border-gray-200 bg-white text-slate-900'} px-2 py-1.5 text-sm"
												>
													<option value="string">String</option>
													<option value="number">Number</option>
													<option value="integer">Integer</option>
													<option value="boolean">Boolean</option>
													<option value="object">Object</option>
													<option value="array">Array</option>
												</select>
												{#if nestedRootItems.type === 'object'}
													<div class="mt-3">
														<div class="mb-2 flex items-center justify-between">
															<span class="text-sm font-medium {darkMode ? 'text-slate-200' : 'text-slate-700'}">Item properties</span>
															<button type="button" onclick={addNestedRootItemProperty} class="rounded bg-teal-600 px-3 py-1 text-xs text-white hover:bg-teal-700">+ Add Property</button>
														</div>
														{#each nestedRootItems.properties || [] as ip (ip.id)}
															<div class="mb-2 rounded border {darkMode ? 'border-gray-600 bg-slate-800' : 'border-gray-200 bg-white'} p-2">
																<div class="mb-1 flex flex-wrap items-center gap-2">
																	<input type="text" value={ip.name} oninput={(e) => updateNestedRootItemProperty(ip.id, { name: e.currentTarget.value })} class="min-w-20 rounded border {darkMode ? 'border-gray-600 bg-slate-700 text-slate-100' : 'border-gray-200 bg-white text-slate-900'} px-2 py-1 text-sm" placeholder="Name" />
																	<select value={ip.type} onchange={(e) => { const v = e.currentTarget.value as NestedSchemaNodeType; updateNestedRootItemProperty(ip.id, { type: v, children: v === 'object' ? [] : undefined, itemSchema: v === 'array' ? { type: 'string' } : undefined }); }} class="rounded border {darkMode ? 'border-gray-600 bg-slate-700 text-slate-100' : 'border-gray-200 bg-white text-slate-900'} px-2 py-1 text-sm">
																		<option value="string">String</option><option value="number">Number</option><option value="integer">Integer</option><option value="boolean">Boolean</option><option value="object">Object</option><option value="array">Array</option>
																	</select>
																	<label class="flex items-center gap-1 text-sm {darkMode ? 'text-slate-200' : 'text-slate-700'}"><input type="checkbox" checked={ip.required} onchange={(e) => updateNestedRootItemProperty(ip.id, { required: e.currentTarget.checked })} class="cursor-pointer" />Required</label>
																	<button type="button" onclick={() => removeNestedRootItemProperty(ip.id)} class="rounded bg-red-500 px-2 py-1 text-xs text-white hover:bg-red-600">Remove</button>
																</div>
																<textarea value={ip.description} oninput={(e) => updateNestedRootItemProperty(ip.id, { description: e.currentTarget.value })} placeholder="Extraction description" class="w-full rounded border {darkMode ? 'border-gray-600 bg-slate-700 text-slate-100' : 'border-gray-200 bg-white text-slate-900'} px-2 py-1 text-xs" rows="1"></textarea>
															</div>
														{/each}
													</div>
												{/if}
											</div>
										{/if}
										<div class="rounded-md border {darkMode ? 'border-teal-700 bg-teal-900/30' : 'border-teal-200 bg-teal-100'} p-3">
											<strong class="mb-2 block text-sm {darkMode ? 'text-teal-200' : 'text-slate-900'}">Schema Preview:</strong>
											<pre class="max-h-48 overflow-auto text-xs {darkMode ? 'text-slate-200' : 'text-slate-700'}">{JSON.stringify(nestedSchemaPreview, null, 2)}</pre>
										</div>
									</div>
								{:else}
									<div class="rounded-md border {darkMode ? 'border-teal-600 bg-teal-900/30' : 'border-teal-300 bg-teal-50'} p-4">
										<div class="mb-4">
											<div class="mb-2 flex items-center justify-between">
												<div class="block text-sm font-medium {darkMode ? 'text-slate-200' : 'text-slate-700'}">Fields to get back</div>
												<div class="flex gap-2">
													<button
														type="button"
														onclick={() => addSchemaField(true)}
														class="rounded bg-amber-600 px-3 py-1 text-xs text-white hover:bg-amber-700"
														title="Add a field for the AI to explain its reasoning (recommended)"
													>
														+ Add reasoning
													</button>
													<button
														type="button"
														onclick={() => addSchemaField(false)}
														class="rounded bg-teal-600 px-3 py-1 text-xs text-white hover:bg-teal-700"
													>
														+ Add field
													</button>
												</div>
											</div>
											<div class="space-y-3">
												{#each orderedFieldEntries as [fieldName, fieldSchema] (fieldName)}
													<div class="rounded border {darkMode ? 'border-gray-600 bg-slate-800' : 'border-gray-300 bg-white'} p-3">
														<div class="mb-2 flex items-center gap-2">
															{#key fieldName}
																<input
																	type="text"
																	value={fieldName}
																	onblur={(e) => {
																		const newName = e.currentTarget.value.trim();
																		if (newName && newName !== fieldName) {
																			updateFieldName(fieldName, newName);
																		} else if (!newName) {
																			e.currentTarget.value = fieldName;
																		}
																	}}
																	onkeydown={(e) => {
																		if (e.key === 'Enter') e.currentTarget.blur();
																	}}
																	class="flex-1 rounded border {darkMode ? 'border-gray-600 bg-slate-700 text-slate-100' : 'border-gray-200 bg-white text-slate-900'} px-2 py-1 text-sm font-medium"
																	placeholder="e.g. summary, price_range"
																/>
															{/key}
															<select
																value={fieldSchema.type || 'string'}
																onchange={(e) => updateSchemaFieldType(fieldName, e.currentTarget.value)}
																class="rounded border {darkMode ? 'border-gray-600 bg-slate-700 text-slate-100' : 'border-gray-200 bg-white text-slate-900'} px-2 py-1 text-sm"
															>
																<option value="string">string</option>
																<option value="number">number</option>
																<option value="integer">integer</option>
																<option value="boolean">boolean</option>
																<option value="array">array</option>
																<option value="object">object</option>
															</select>
															<label class="flex cursor-pointer items-center gap-1 text-sm {darkMode ? 'text-slate-200' : 'text-slate-700'}">
																<input
																	type="checkbox"
																	checked={schemaRequired.includes(fieldName)}
																	onchange={() => toggleSchemaFieldRequired(fieldName)}
																	class="cursor-pointer"
																/>
																Required
															</label>
															<button
																type="button"
																onclick={() => removeSchemaField(fieldName)}
																class="rounded bg-red-500 px-2 py-1 text-xs text-white hover:bg-red-600"
															>
																Remove
															</button>
														</div>
														<div class="mb-2">
															<div class="mb-1 block text-xs font-medium {darkMode ? 'text-slate-300' : 'text-gray-700'}">
																Extraction Description <span class="text-red-500">*</span>
															</div>
															<textarea
																value={fieldSchema.description || ''}
																oninput={(e) => updateSchemaField(fieldName, { description: e.currentTarget.value })}
																placeholder="Describe this Property's purpose and expected values... 
This will be used by the LLM to extract this property"
																class="w-full rounded border {darkMode ? 'border-gray-600 bg-slate-700 text-slate-100' : 'border-gray-200 bg-white text-slate-900'} px-2 py-1 text-xs"
																rows="2"
															></textarea>
														</div>
														{#if fieldSchema.type === 'string'}
															<div class="mb-2">
																<div class="mb-1 block text-xs font-medium {darkMode ? 'text-slate-300' : 'text-gray-700'}">
																	Allowed values (comma-separated, optional)
																</div>
																<input
																	type="text"
																	value={fieldSchema.enum ? fieldSchema.enum.join(', ') : ''}
																	oninput={(e) => {
																		const value = e.currentTarget.value.trim();
																		if (value) {
																			const enumValues = value.split(',').map((v) => v.trim()).filter(Boolean);
																			updateSchemaField(fieldName, { enum: enumValues });
																		} else {
																			const updated = { ...fieldSchema };
																			delete updated.enum;
																			updateSchemaField(fieldName, updated);
																		}
																	}}
																	placeholder="e.g., low, medium, high"
																	class="w-full rounded border {darkMode ? 'border-gray-600 bg-slate-700 text-slate-100' : 'border-gray-200 bg-white text-slate-900'} px-2 py-1 text-xs"
																/>
															</div>
														{/if}
														{#if fieldSchema.type === 'number' || fieldSchema.type === 'integer'}
															<div class="mb-2 grid grid-cols-2 gap-2">
																<div>
																	<div class="mb-1 block text-xs font-medium {darkMode ? 'text-slate-300' : 'text-gray-700'}">Minimum</div>
																	<input
																		type="number"
																		value={fieldSchema.minimum ?? ''}
																		oninput={(e) => {
																			const value = e.currentTarget.value;
																			updateSchemaField(fieldName, value ? { minimum: Number(value) } : { minimum: undefined });
																		}}
																		class="w-full rounded border {darkMode ? 'border-gray-600 bg-slate-700 text-slate-100' : 'border-gray-200 bg-white text-slate-900'} px-2 py-1 text-xs"
																	/>
																</div>
																<div>
																	<div class="mb-1 block text-xs font-medium {darkMode ? 'text-slate-300' : 'text-gray-700'}">Maximum</div>
																	<input
																		type="number"
																		value={fieldSchema.maximum ?? ''}
																		oninput={(e) => {
																			const value = e.currentTarget.value;
																			updateSchemaField(fieldName, value ? { maximum: Number(value) } : { maximum: undefined });
																		}}
																		class="w-full rounded border {darkMode ? 'border-gray-600 bg-slate-700 text-slate-100' : 'border-gray-200 bg-white text-slate-900'} px-2 py-1 text-xs"
																	/>
																</div>
															</div>
														{/if}
													</div>
												{/each}
												{#if Object.keys(schemaProperties).length === 0}
													<p class="text-sm {darkMode ? 'text-gray-400' : 'text-gray-500'}">
														No fields yet. Click “+ Add reasoning” or “+ Add field” above to define what the AI should return.
													</p>
												{/if}
											</div>
										</div>
										<div class="rounded-md border {darkMode ? 'border-teal-700 bg-teal-900/30' : 'border-teal-200 bg-teal-100'} p-3">
											<strong class="mb-2 block text-sm {darkMode ? 'text-teal-200' : 'text-slate-900'}">Schema Preview:</strong>
											<pre class="max-h-48 overflow-auto text-xs {darkMode ? 'text-slate-200' : 'text-slate-700'}">{JSON.stringify(schemaPreview, null, 2)}</pre>
										</div>
									</div>
								{/if}
							</div>
						{/if}
					</div>
				</div>

				<!-- Advanced Options -->
				<div class="mt-6 pt-6 {darkMode ? 'border-slate-700' : 'border-slate-200'} border-t">
					<button
						type="button"
						onclick={() => (showAdvanced = !showAdvanced)}
						class="w-full flex items-center justify-between text-left py-2 {darkMode ? 'text-slate-300 hover:text-white' : 'text-slate-700 hover:text-slate-900'} transition-colors"
					>
						<span class="text-sm font-semibold">More options</span>
						<svg
							class="w-5 h-5 transition-transform {showAdvanced ? 'rotate-180' : ''}"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
						</svg>
					</button>

					{#if showAdvanced}
						<div class="mt-4 space-y-5">
							<div>
								<h3 class="text-xs font-semibold {darkMode ? 'text-slate-400' : 'text-slate-500'} uppercase tracking-wide mb-3">
									Answer behavior
								</h3>
								<div class="grid grid-cols-2 gap-4">
									<div>
										<label for="temperature" class="block text-sm font-medium {darkMode ? 'text-slate-300' : 'text-slate-700'} mb-1.5">
											Creativity <span class="text-xs font-normal">(0–2, higher = more varied)</span>
										</label>
										<input
											type="number"
											id="temperature"
											bind:value={temperature}
											min="0"
											max="2"
											step="0.1"
											placeholder="1.0"
											class="w-full px-3 py-2 {darkMode ? 'bg-slate-700 text-white border-slate-600 placeholder-slate-500' : 'bg-white text-slate-900 border-slate-300'} rounded-md border focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
										/>
									</div>
									<div>
										<label for="max-tokens" class="block text-sm font-medium {darkMode ? 'text-slate-300' : 'text-slate-700'} mb-1.5">
											Max Tokens
										</label>
										<input
											type="number"
											id="max-tokens"
											bind:value={maxTokens}
											min="1"
											placeholder="Auto"
											class="w-full px-3 py-2 {darkMode ? 'bg-slate-700 text-white border-slate-600 placeholder-slate-500' : 'bg-white text-slate-900 border-slate-300'} rounded-md border focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
										/>
									</div>
									<div>
										<label for="top-p" class="block text-sm font-medium {darkMode ? 'text-slate-300' : 'text-slate-700'} mb-1.5">
											Diversity <span class="text-xs font-normal">(0–1)</span>
										</label>
										<input
											type="number"
											id="top-p"
											bind:value={topP}
											min="0"
											max="1"
											step="0.1"
											placeholder="1.0"
											class="w-full px-3 py-2 {darkMode ? 'bg-slate-700 text-white border-slate-600 placeholder-slate-500' : 'bg-white text-slate-900 border-slate-300'} rounded-md border focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
										/>
									</div>
									<div>
										<label for="frequency-penalty" class="block text-sm font-medium {darkMode ? 'text-slate-300' : 'text-slate-700'} mb-1.5">
											Frequency Penalty
										</label>
										<input
											type="number"
											id="frequency-penalty"
											bind:value={frequencyPenalty}
											min="-2"
											max="2"
											step="0.1"
											placeholder="0"
											class="w-full px-3 py-2 {darkMode ? 'bg-slate-700 text-white border-slate-600 placeholder-slate-500' : 'bg-white text-slate-900 border-slate-300'} rounded-md border focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
										/>
									</div>
								</div>
								<div class="mt-4">
									<label for="stop-sequences" class="block text-sm font-medium {darkMode ? 'text-slate-300' : 'text-slate-700'} mb-1.5">
										Stop at these phrases <span class="text-xs font-normal">(comma-separated)</span>
									</label>
									<input
										type="text"
										id="stop-sequences"
										bind:value={stopSequences}
										placeholder="e.g. END, [DONE]"
										class="w-full px-3 py-2 {darkMode ? 'bg-slate-700 text-white border-slate-600 placeholder-slate-500' : 'bg-white text-slate-900 border-slate-300'} rounded-md border focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
									/>
								</div>
							</div>
						</div>
					{/if}
				</div>

				<!-- Footer -->
				<div class="flex gap-3 mt-8 pt-6 {darkMode ? 'border-slate-700' : 'border-slate-200'} border-t">
					<button
						type="button"
						onclick={handleSave}
						disabled={saving}
						class="flex-1 px-4 py-2.5 {darkMode ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-slate-900 hover:bg-slate-800'} text-white rounded-md transition-colors font-semibold text-sm shadow-sm hover:shadow disabled:opacity-60 disabled:cursor-not-allowed"
					>
						{saving ? 'Saving…' : (isCreating ? 'Create prompt' : 'Save changes')}
					</button>
					<button
						type="button"
						onclick={handleCancel}
						class="flex-1 px-4 py-2.5 {darkMode ? 'bg-slate-700 hover:bg-slate-600 text-slate-200 border-slate-600' : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'} rounded-md transition-colors font-semibold text-sm border"
					>
						Cancel
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
