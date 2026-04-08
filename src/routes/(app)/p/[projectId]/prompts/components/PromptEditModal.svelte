<script lang="ts">
	import type { Prompt } from '@stratiqai/types-simple';
	import type { AiModel } from '@stratiqai/types-simple';
	import {
		PromptEditor,
		buildSchemaPreview,
		getOrderedFieldEntries,
		parseJsonSchemaToBuilderState
	} from '@stratiqai/dashboard-widget-sdk';
	import JsonSchemaPickerModal from '$lib/components/schemas/JsonSchemaPickerModal.svelte';
	import { Q_GET_JSON_SCHEMA } from '$lib/services/graphql/jsonSchemaOperations';
	import type { IGraphQLQueryClient } from '$lib/services/realtime/store/GraphQLQueryClient';
	import { getTemplateStrForEditor, parseTemplateToAIQueryData, type AIQueryData } from '../PromptService';
	import { aiService } from '$lib/services/ai';
	import { authStore } from '$lib/stores/auth.svelte';
	import { createLogger } from '$lib/utils/logger';

	const log = createLogger('prompts');

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
	const DEFAULT_AI_MODEL: AiModel = 'GEMINI_3_1_FLASH_PREVIEW' as AiModel;
	const DEFAULT_SYSTEM_PROMPT =
		'You are a expert commercial real estate investor and broker that can evaluate documents and extract information';

	function normalizeToAIModel(value: string | undefined): AiModel {
		if (value && VALID_AI_MODELS.has(value)) return value as AiModel;
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
		projectId = '',
		onSave,
		onCancel
	}: {
		darkMode?: boolean;
		template?: Prompt | null;
		isCreating?: boolean;
		queryClient?: IGraphQLQueryClient | null;
		projectId?: string;
		onSave?: (data: {
			name: string;
			description: string;
			aiQueryData: AIQueryData;
			jsonSchemaId?: string;
			schemaData?: { name: string; description?: string; schemaDefinition: unknown };
		}) => void | Promise<void>;
		onCancel?: () => void;
	} = $props();

	let currentJsonSchemaId = $state<string | undefined>(undefined);
	let showSchemaPicker = $state(false);
	let saving = $state(false);

	let templateName = $state('');
	let templateDescription = $state('');
	let aiQueryModel = $state<string>(DEFAULT_AI_MODEL);
	let aiQuerySystemPrompt = $state(DEFAULT_SYSTEM_PROMPT);
	let aiQueryPrompt = $state('');

	let temperature = $state<number | undefined>(undefined);
	let maxTokens = $state<number | undefined>(undefined);
	let topP = $state<number | undefined>(undefined);
	let frequencyPenalty = $state<number | undefined>(undefined);
	let stopSequences = $state<string>('');

	let responseFormatType = $state<'text' | 'json_object' | 'json_schema'>('json_schema');
	let schemaProperties = $state<Record<string, Record<string, unknown>>>({});
	let schemaRequired = $state<string[]>([]);
	let fieldOrder = $state<string[]>([]);

	let presencePenalty = $state<number | undefined>(undefined);
	let stream = $state(false);
	let user = $state('');
	let seed = $state<number | undefined>(undefined);
	let logitBiasText = $state('');
	let metadataText = $state('');

	let aiGenerateDescription = $state('');
	let aiGenerating = $state(false);
	let aiGenerateError = $state('');

	let orderedFieldEntries = $derived(getOrderedFieldEntries(schemaProperties, fieldOrder));
	let schemaPreview = $derived(buildSchemaPreview(schemaProperties, schemaRequired));

	function applySchemaDefinitionToForm(schemaDefRaw: unknown) {
		const schema = typeof schemaDefRaw === 'string'
			? (() => { try { return JSON.parse(schemaDefRaw); } catch { return {}; } })()
			: (schemaDefRaw as Record<string, unknown>);
		const state = parseJsonSchemaToBuilderState(schema);
		schemaProperties = state.properties;
		schemaRequired = state.required;
		fieldOrder = state.fieldOrder;
		responseFormatType = 'json_schema';
	}

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
					const state = parseJsonSchemaToBuilderState((rf as { schema: any }).schema);
					schemaProperties = state.properties;
					schemaRequired = state.required;
					fieldOrder = state.fieldOrder;
				}
			} else {
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
		} else if (isCreating) {
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
			schemaProperties = {};
			schemaRequired = [];
			fieldOrder = [];
			stream = false;
			user = '';
			seed = undefined;
			logitBiasText = '';
			metadataText = '';
		}
	});

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
			log.error('Failed to load JsonSchema:', e);
		}
	}

	function handleSchemaPickerSelect(schema: { id: string; jsonSchemaId: string; schemaDefinition: string }) {
		currentJsonSchemaId = schema.jsonSchemaId || schema.id;
		applySchemaDefinitionToForm(schema.schemaDefinition);
		showSchemaPicker = false;
	}

	async function handleAiGenerate() {
		if (!aiGenerateDescription.trim() || aiGenerating) return;
		aiGenerating = true;
		aiGenerateError = '';
		try {
			const token = authStore.idToken;
			if (!token) {
				aiGenerateError = 'Not authenticated';
				return;
			}

			const draft = await aiService.generateDraft(
				{ description: aiGenerateDescription.trim() },
				token
			);

			if (draft.suggestedName) templateName = draft.suggestedName;
			aiQueryPrompt = draft.prompt;
			if (draft.systemInstruction) aiQuerySystemPrompt = draft.systemInstruction;

			if (draft.jsonSchema) {
				applySchemaDefinitionToForm(draft.jsonSchema);
			}

			aiGenerateDescription = '';
		} catch (e) {
			log.error('AI generate failed:', e);
			aiGenerateError = e instanceof Error ? e.message : 'Generation failed';
		} finally {
			aiGenerating = false;
		}
	}

	async function handleSave() {
		if (!templateName.trim()) {
			alert('Please enter a template name');
			return;
		}
		if (responseFormatType === 'json_schema' && Object.keys(schemaProperties).length > 0) {
			const missing = orderedFieldEntries
				.filter(([, f]) => !((f as Record<string, unknown>).description as string)?.trim())
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
				}
			}
		}

		if (stream) aiQueryData.stream = true;
		if (user.trim()) aiQueryData.user = user.trim();
		if (seed !== undefined) aiQueryData.seed = seed;
		if (logitBiasText.trim()) {
			try { aiQueryData.logitBias = JSON.parse(logitBiasText); } catch (e) { log.error('Invalid logit bias:', e); }
		}
		if (metadataText.trim()) {
			try { aiQueryData.metadata = JSON.parse(metadataText); } catch (e) { log.error('Invalid metadata:', e); }
		}

		let schemaData: { name: string; description?: string; schemaDefinition: unknown } | undefined;
		if (responseFormatType === 'json_schema' && Object.keys(schemaProperties).length > 0) {
			schemaData = {
				name: templateName.trim() || 'Structured output',
				description: templateDescription.trim() || undefined,
				schemaDefinition: schemaPreview
			};
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
			log.error('Save failed:', err);
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

		<div class="flex-1 overflow-y-auto px-6 py-5 space-y-6">
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

			<PromptEditor
				{darkMode}
				bind:promptName={templateName}
				bind:promptDescription={templateDescription}
				bind:userPrompt={aiQueryPrompt}
				bind:systemInstruction={aiQuerySystemPrompt}
				bind:model={aiQueryModel}
				bind:responseFormatType
				bind:schemaProperties
				bind:schemaRequired
				bind:fieldOrder
				bind:temperature
				bind:maxTokens
				bind:topP
				bind:frequencyPenalty
				bind:stopSequences
				onLoadSchemaFromLibrary={queryClient ? () => { showSchemaPicker = true; } : undefined}
			/>
		</div>
	</div>
</div>

{#if showSchemaPicker && queryClient}
	<JsonSchemaPickerModal
		{darkMode}
		{queryClient}
		{projectId}
		selectedSchemaId={currentJsonSchemaId}
		onselect={handleSchemaPickerSelect}
		onclose={() => showSchemaPicker = false}
	/>
{/if}
{/if}
