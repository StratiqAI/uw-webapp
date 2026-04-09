<script lang="ts">
	import type { EntityDefinition, Prompt, AiQueryExecution, SaveInstanceInput, EntityInstance } from '@stratiqai/types-simple';
	import { M_SAVE_ENTITY_INSTANCE } from '@stratiqai/types-simple';
	import {
		PromptEditor,
		buildSchemaPreview,
		getOrderedFieldEntries,
		parseJsonSchemaToBuilderState
	} from '@stratiqai/dashboard-widget-sdk';
	import type { IGraphQLQueryClient } from '$lib/services/realtime/store/GraphQLQueryClient';
	import { Q_LIST_PROMPTS, M_CREATE_PROMPT, M_UPDATE_PROMPT } from '$lib/services/graphql/promptOperations';
	import { aiService } from '$lib/services/ai';
	import type { ExecutionHandle } from '$lib/services/ai/types';
	import {
		type AIQueryData,
		getTemplateStrForEditor,
		parseTemplateToAIQueryData,
		serializeAIQueryDataToTemplate,
		extractPromptVariableNames
	} from '$lib/services/promptUtils';
	import { flatToPropertyValues, toOntologyInstDataTopic, toOntologyInstMetaTopic } from '$lib/services/realtime/store/ontologyClientHelpers';
	import { validatedTopicStore } from '$lib/stores/validatedTopicStore';
	import { createLogger } from '$lib/utils/logger';

	const log = createLogger('ontology-prompt-testing');

	const DEFAULT_SYSTEM_PROMPT =
		'You are a expert commercial real estate investor and broker that can evaluate documents and extract information';

	interface Props {
		definition: EntityDefinition;
		projectId: string;
		idToken: string;
		queryClient: IGraphQLQueryClient;
		darkMode: boolean;
		syncManager?: { status: string } | null;
	}

	let { definition, projectId, idToken, queryClient, darkMode, syncManager }: Props = $props();

	// Prompt lookup state
	let linkedPrompt = $state<Prompt | null>(null);
	let promptLoading = $state(false);
	let promptError = $state('');

	// PromptEditor bindings
	let templateName = $state('');
	let templateDescription = $state('');
	let aiQueryModel = $state('GEMINI_2_5_FLASH');
	let aiQuerySystemPrompt = $state(DEFAULT_SYSTEM_PROMPT);
	let aiQueryPrompt = $state('');
	let temperature = $state<number | undefined>(undefined);
	let maxTokens = $state<number | undefined>(undefined);
	let topP = $state<number | undefined>(undefined);
	let frequencyPenalty = $state<number | undefined>(undefined);
	let stopSequences = $state('');
	let responseFormatType = $state<'text' | 'json_object' | 'json_schema'>('json_schema');
	let schemaProperties = $state<Record<string, Record<string, unknown>>>({});
	let schemaRequired = $state<string[]>([]);
	let fieldOrder = $state<string[]>([]);

	// Execution state
	let saving = $state(false);
	let executing = $state(false);
	let executionHandle = $state<ExecutionHandle | null>(null);
	let executionStatus = $state<string | null>(null);
	let executionResult = $state<string | null>(null);
	let executionError = $state('');
	let executionMeta = $state<Partial<AiQueryExecution> | null>(null);

	// Results state
	let parsedResult = $state<Record<string, unknown> | null>(null);
	let savingInstance = $state(false);
	let instanceSaved = $state(false);

	// Collapsible sections
	let schemaPreviewOpen = $state(false);
	let rawResultOpen = $state(false);

	let schemaJson = $derived.by(() => {
		const raw = definition.normalizedJsonSchema ?? definition.jsonSchema;
		if (!raw) return null;
		try {
			const obj = typeof raw === 'string' ? JSON.parse(raw) : raw;
			return JSON.stringify(obj, null, 2);
		} catch {
			return String(raw);
		}
	});

	// Load the linked prompt when definition changes
	$effect(() => {
		const defId = definition.id;
		const schemaId = definition.jsonSchemaId;
		linkedPrompt = null;
		promptError = '';
		resetEditorState();
		resetExecutionState();

		if (schemaId) {
			loadLinkedPrompt(schemaId);
		} else {
			populateEditorFromDefinition();
		}
	});

	async function loadLinkedPrompt(jsonSchemaId: string) {
		promptLoading = true;
		promptError = '';
		try {
			const response = await queryClient.query<{ listPrompts: { items: Prompt[] } }>(
				Q_LIST_PROMPTS,
				{ scope: 'OWNED_BY_ME', limit: 200 }
			);
			const prompts = response?.listPrompts?.items ?? [];
			const match = prompts.find(
				(p) => (p as { jsonSchemaId?: string }).jsonSchemaId === jsonSchemaId
			);

			if (match) {
				linkedPrompt = match;
				populateEditorFromPrompt(match);
			} else {
				populateEditorFromDefinition();
			}
		} catch (err) {
			log.error('Failed to load prompts:', err);
			promptError = err instanceof Error ? err.message : 'Failed to load prompts';
			populateEditorFromDefinition();
		} finally {
			promptLoading = false;
		}
	}

	function populateEditorFromPrompt(prompt: Prompt) {
		templateName = prompt.name || '';
		templateDescription = prompt.description || '';
		aiQueryModel = prompt.model || 'GEMINI_2_5_FLASH';

		const templateStr = getTemplateStrForEditor(prompt);
		const data = parseTemplateToAIQueryData(templateStr);

		aiQueryPrompt = data.prompt || '';
		aiQuerySystemPrompt = data.systemPrompt || DEFAULT_SYSTEM_PROMPT;
		temperature = data.temperature;
		maxTokens = data.maxTokens;
		topP = data.topP;
		frequencyPenalty = data.frequencyPenalty;
		stopSequences = Array.isArray(data.stop) ? data.stop.join(', ') : data.stop ?? '';

		if (data.responseFormat) {
			const rfType = data.responseFormat.type;
			responseFormatType = (rfType === 'json_schema' || rfType === 'json_object' || rfType === 'text')
				? rfType : 'json_schema';
			if (rfType === 'json_schema' && data.responseFormat.schema) {
				const state = parseJsonSchemaToBuilderState(data.responseFormat.schema);
				schemaProperties = state.properties;
				schemaRequired = state.required;
				fieldOrder = state.fieldOrder;
			}
		} else {
			applyDefinitionSchema();
		}
	}

	function populateEditorFromDefinition() {
		templateName = definition.name || '';
		templateDescription = definition.description || '';
		aiQueryPrompt = `Analyze the provided documents and extract the following structured data for: ${definition.name}`;
		aiQuerySystemPrompt = DEFAULT_SYSTEM_PROMPT;
		aiQueryModel = 'GEMINI_2_5_FLASH';
		applyDefinitionSchema();
	}

	function applyDefinitionSchema() {
		const raw = definition.normalizedJsonSchema ?? definition.jsonSchema;
		if (!raw) return;
		try {
			const schema = typeof raw === 'string' ? JSON.parse(raw) : raw;
			const state = parseJsonSchemaToBuilderState(schema);
			schemaProperties = state.properties;
			schemaRequired = state.required;
			fieldOrder = state.fieldOrder;
			responseFormatType = 'json_schema';
		} catch {
			// Schema couldn't be parsed for builder
		}
	}

	function resetEditorState() {
		templateName = '';
		templateDescription = '';
		aiQueryPrompt = '';
		aiQuerySystemPrompt = DEFAULT_SYSTEM_PROMPT;
		aiQueryModel = 'GEMINI_2_5_FLASH';
		temperature = undefined;
		maxTokens = undefined;
		topP = undefined;
		frequencyPenalty = undefined;
		stopSequences = '';
		responseFormatType = 'json_schema';
		schemaProperties = {};
		schemaRequired = [];
		fieldOrder = [];
	}

	function resetExecutionState() {
		executionHandle?.destroy();
		executionHandle = null;
		executionStatus = null;
		executionResult = null;
		executionError = '';
		executionMeta = null;
		parsedResult = null;
		instanceSaved = false;
	}

	function gatherAIQueryData(): AIQueryData {
		const data: AIQueryData = {
			prompt: aiQueryPrompt,
			model: aiQueryModel
		};
		data.systemPrompt = aiQuerySystemPrompt || DEFAULT_SYSTEM_PROMPT;
		if (temperature !== undefined) data.temperature = temperature;
		if (maxTokens !== undefined) data.maxTokens = maxTokens;
		if (topP !== undefined) data.topP = topP;
		if (frequencyPenalty !== undefined) data.frequencyPenalty = frequencyPenalty;
		if (stopSequences.trim()) {
			const arr = stopSequences.split(',').map((s) => s.trim()).filter(Boolean);
			data.stop = arr.length === 1 ? arr[0] : arr;
		}
		if (responseFormatType !== 'text') {
			if (responseFormatType === 'json_object') {
				data.responseFormat = { type: 'json_object' };
			} else if (responseFormatType === 'json_schema' && Object.keys(schemaProperties).length > 0) {
				data.responseFormat = { type: 'json_schema', schema: buildSchemaPreview(schemaProperties, schemaRequired) };
			}
		}
		return data;
	}

	async function handleSave() {
		if (saving) return;
		saving = true;
		try {
			const aiQueryData = gatherAIQueryData();
			const variableNames = extractPromptVariableNames(aiQueryData.prompt);

			if (linkedPrompt) {
				const input: Record<string, unknown> = {
					name: templateName.trim(),
					description: templateDescription.trim() || undefined,
					prompt: aiQueryData.prompt,
					systemInstruction: aiQueryData.systemPrompt ?? undefined,
					model: aiQueryData.model,
					...(variableNames.length > 0 && { inputVariables: variableNames })
				};

				const response = await queryClient.query<{ updatePrompt: Prompt }>(
					M_UPDATE_PROMPT,
					{ id: linkedPrompt.id, input }
				);
				if (response?.updatePrompt) {
					linkedPrompt = response.updatePrompt;
				}
			} else {
				const input: Record<string, unknown> = {
					name: templateName.trim() || definition.name,
					description: templateDescription.trim() || definition.description || undefined,
					prompt: aiQueryData.prompt,
					systemInstruction: aiQueryData.systemPrompt ?? undefined,
					model: aiQueryData.model,
					sharingMode: 'PRIVATE',
					...(variableNames.length > 0 && { inputVariables: variableNames }),
					...(definition.jsonSchemaId && { jsonSchemaId: definition.jsonSchemaId })
				};

				const response = await queryClient.query<{ createPrompt: Prompt }>(
					M_CREATE_PROMPT,
					{ input }
				);
				if (response?.createPrompt) {
					linkedPrompt = response.createPrompt;
				}
			}
		} catch (err) {
			log.error('Failed to save prompt:', err);
			promptError = err instanceof Error ? err.message : 'Failed to save prompt';
		} finally {
			saving = false;
		}
	}

	async function handleRun() {
		if (executing || !linkedPrompt) return;

		// Auto-save first if needed
		if (!linkedPrompt) {
			await handleSave();
			if (!linkedPrompt) return;
		}

		resetExecutionState();
		executing = true;
		executionStatus = 'SUBMITTING';

		try {
			const aiQueryData = gatherAIQueryData();
			const schemaDef = (responseFormatType === 'json_schema' && Object.keys(schemaProperties).length > 0)
				? buildSchemaPreview(schemaProperties, schemaRequired)
				: undefined;

			const inputValues: Record<string, unknown> = {
				prompt: aiQueryData.prompt,
				systemInstruction: aiQueryData.systemPrompt,
				model: aiQueryData.model,
				...(schemaDef && { responseFormat: { type: 'json_schema', schema: schemaDef } }),
				...(aiQueryData.temperature !== undefined && { temperature: aiQueryData.temperature }),
				...(aiQueryData.maxTokens !== undefined && { maxTokens: aiQueryData.maxTokens }),
				...(aiQueryData.topP !== undefined && { topP: aiQueryData.topP }),
				...(aiQueryData.frequencyPenalty !== undefined && { frequencyPenalty: aiQueryData.frequencyPenalty })
			};

			const handle = await aiService.submitExecution(
				{
					projectId,
					promptId: linkedPrompt.id,
					inputValues,
					priority: 'MEDIUM'
				},
				idToken
			);

			executionHandle = handle;

			const unsubStatus = handle.status.subscribe((s) => {
				if (s) executionStatus = s;
			});
			const unsubExec = handle.execution.subscribe((exec) => {
				if (exec) {
					executionMeta = {
						model: exec.model ?? undefined,
						promptTokenCount: exec.promptTokenCount ?? undefined,
						candidatesTokenCount: exec.candidatesTokenCount ?? undefined,
						totalTokenCount: exec.totalTokenCount ?? undefined,
						durationMs: exec.durationMs ?? undefined,
						status: exec.status,
						errorMessage: exec.errorMessage ?? undefined
					};
				}
			});

			handle.result.then((rawOutput) => {
				executionResult = rawOutput;
				if (rawOutput) {
					try {
						const parsed = JSON.parse(rawOutput);
						const resolved = parsed.output_parsed ?? parsed;
						parsedResult = (resolved && typeof resolved === 'object' && !Array.isArray(resolved))
							? resolved as Record<string, unknown>
							: { content: typeof resolved === 'string' ? resolved : rawOutput };
					} catch {
						parsedResult = { content: rawOutput };
					}
				}
				executing = false;
			}).catch((err) => {
				log.error('Execution failed:', err);
				executionError = err instanceof Error ? err.message : String(err);
				executing = false;
			}).finally(() => {
				unsubStatus();
				unsubExec();
			});
		} catch (err) {
			log.error('Failed to submit execution:', err);
			executionError = err instanceof Error ? err.message : 'Failed to submit';
			executing = false;
		}
	}

	async function handleSaveAsInstance() {
		if (!parsedResult || savingInstance || !definition.id) return;
		savingInstance = true;
		try {
			const instanceId = crypto.randomUUID();
			const instanceInput: SaveInstanceInput = {
				id: instanceId,
				projectId,
				definitionId: definition.id,
				senderId: 'ontology-prompt-test',
				label: `${definition.name} - test result`,
				values: flatToPropertyValues(parsedResult)
			};

			const result = await queryClient.query<{ saveEntityInstance: EntityInstance }>(
				M_SAVE_ENTITY_INSTANCE,
				{ input: instanceInput }
			);

			if (result?.saveEntityInstance) {
				const structuralHash = definition.structuralHash;
				if (structuralHash) {
					const instDataTopic = toOntologyInstDataTopic(projectId, structuralHash, instanceId);
					validatedTopicStore.publish(instDataTopic, parsedResult);
					const instMetaTopic = toOntologyInstMetaTopic(projectId, structuralHash, instanceId);
					validatedTopicStore.publish(instMetaTopic, {
						label: instanceInput.label,
						updatedAt: result.saveEntityInstance.updatedAt ?? new Date().toISOString()
					});
				}
				instanceSaved = true;
				log.info(`Saved EntityInstance ${instanceId} from prompt test`);
			}
		} catch (err) {
			log.error('Failed to save instance:', err);
			executionError = err instanceof Error ? err.message : 'Failed to save instance';
		} finally {
			savingInstance = false;
		}
	}

	function statusBadgeClass(status: string | null): string {
		switch (status) {
			case 'SUCCESS': return darkMode ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-100 text-emerald-700';
			case 'ERROR': return darkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700';
			case 'CANCELLED': return darkMode ? 'bg-amber-900/30 text-amber-400' : 'bg-amber-100 text-amber-700';
			case 'PROCESSING': return darkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-700';
			case 'QUEUED': case 'PENDING': return darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600';
			default: return darkMode ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500';
		}
	}
</script>

<div class="flex h-full flex-col overflow-hidden">
	<!-- Header -->
	<div class="flex shrink-0 items-center justify-between border-b px-4 py-2.5 {darkMode ? 'border-slate-700 bg-slate-800/30' : 'border-slate-200 bg-white'}">
		<div class="flex items-center gap-2 min-w-0">
			<svg class="h-4 w-4 shrink-0 {darkMode ? 'text-indigo-400' : 'text-indigo-600'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
			</svg>
			<h3 class="truncate text-sm font-semibold {darkMode ? 'text-slate-200' : 'text-slate-800'}">
				Prompt Testing
			</h3>
			{#if linkedPrompt}
				<span class="rounded px-1.5 py-0.5 text-[10px] font-medium {darkMode ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-100 text-emerald-600'}">
					Linked
				</span>
			{:else if !promptLoading}
				<span class="rounded px-1.5 py-0.5 text-[10px] font-medium {darkMode ? 'bg-amber-900/30 text-amber-400' : 'bg-amber-100 text-amber-600'}">
					New
				</span>
			{/if}
		</div>

		<div class="flex items-center gap-1.5 shrink-0">
			<button
				type="button"
				onclick={handleSave}
				disabled={saving || promptLoading}
				class="px-3 py-1 text-xs font-semibold rounded-md transition-all disabled:opacity-40 disabled:cursor-not-allowed
					{darkMode ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}"
			>
				{saving ? 'Saving...' : 'Save'}
			</button>
			<button
				type="button"
				onclick={handleRun}
				disabled={executing || promptLoading || (!linkedPrompt && !aiQueryPrompt.trim())}
				class="px-3 py-1 text-xs font-semibold rounded-md transition-all disabled:opacity-40 disabled:cursor-not-allowed
					{darkMode ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}"
			>
				{#if executing}
					<span class="inline-flex items-center gap-1">
						<svg class="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" /><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
						Running...
					</span>
				{:else}
					Run
				{/if}
			</button>
		</div>
	</div>

	{#if promptLoading}
		<div class="flex flex-1 items-center justify-center">
			<div class="flex items-center gap-2 text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'}">
				<svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" /><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
				Loading prompt...
			</div>
		</div>
	{:else}
		<div class="flex-1 overflow-y-auto">
			<!-- Prompt Editor -->
			<div class="border-b px-4 py-4 {darkMode ? 'border-slate-700' : 'border-slate-200'}">
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
					isSaving={saving}
				/>
			</div>

			<!-- JSON Schema Preview -->
			{#if schemaJson}
				<div class="border-b px-4 py-3 {darkMode ? 'border-slate-700' : 'border-slate-200'}">
					<button
						type="button"
						class="flex w-full items-center gap-1.5 text-xs font-semibold uppercase tracking-wider
							{darkMode ? 'text-slate-400 hover:text-slate-300' : 'text-slate-500 hover:text-slate-600'} transition-colors"
						onclick={() => schemaPreviewOpen = !schemaPreviewOpen}
					>
						<svg class="h-3 w-3 transition-transform {schemaPreviewOpen ? 'rotate-90' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
						</svg>
						Definition JSON Schema
					</button>
					{#if schemaPreviewOpen}
						<pre class="mt-2 max-h-48 overflow-auto rounded-md p-3 text-[11px] leading-relaxed
							{darkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-50 text-slate-600'}">{schemaJson}</pre>
					{/if}
				</div>
			{/if}

			<!-- Execution Status & Results -->
			{#if executionStatus || executionError}
				<div class="border-b px-4 py-3 {darkMode ? 'border-slate-700' : 'border-slate-200'}">
					<h4 class="mb-2 text-xs font-semibold uppercase tracking-wider {darkMode ? 'text-slate-400' : 'text-slate-500'}">
						Execution
					</h4>

					<div class="flex flex-wrap items-center gap-2 mb-2">
						{#if executionStatus}
							<span class="rounded px-2 py-0.5 text-[10px] font-semibold uppercase {statusBadgeClass(executionStatus)}">
								{executionStatus}
							</span>
						{/if}
						{#if executionMeta?.model}
							<span class="text-[10px] {darkMode ? 'text-slate-500' : 'text-slate-400'}">
								{executionMeta.model}
							</span>
						{/if}
						{#if executionMeta?.durationMs}
							<span class="text-[10px] {darkMode ? 'text-slate-500' : 'text-slate-400'}">
								{(executionMeta.durationMs / 1000).toFixed(1)}s
							</span>
						{/if}
						{#if executionMeta?.totalTokenCount}
							<span class="text-[10px] {darkMode ? 'text-slate-500' : 'text-slate-400'}">
								{executionMeta.totalTokenCount} tokens
							</span>
						{/if}
					</div>

					{#if executionError}
						<div class="rounded-md p-2 text-xs {darkMode ? 'bg-red-900/20 text-red-400' : 'bg-red-50 text-red-600'}">
							{executionError}
						</div>
					{/if}
					{#if executionMeta?.errorMessage}
						<div class="rounded-md p-2 text-xs {darkMode ? 'bg-red-900/20 text-red-400' : 'bg-red-50 text-red-600'}">
							{executionMeta.errorMessage}
						</div>
					{/if}
				</div>
			{/if}

			<!-- Parsed Result -->
			{#if parsedResult}
				<div class="border-b px-4 py-3 {darkMode ? 'border-slate-700' : 'border-slate-200'}">
					<div class="flex items-center justify-between mb-2">
						<h4 class="text-xs font-semibold uppercase tracking-wider {darkMode ? 'text-slate-400' : 'text-slate-500'}">
							Result
						</h4>
						<button
							type="button"
							onclick={handleSaveAsInstance}
							disabled={savingInstance || instanceSaved}
							class="px-2.5 py-1 text-[10px] font-semibold rounded-md transition-all disabled:opacity-40 disabled:cursor-not-allowed
								{instanceSaved
									? (darkMode ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-100 text-emerald-700')
									: (darkMode ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white')}"
						>
							{#if savingInstance}
								Saving...
							{:else if instanceSaved}
								Saved as Instance
							{:else}
								Save as Instance
							{/if}
						</button>
					</div>

					<div class="space-y-1">
						{#each Object.entries(parsedResult) as [key, value]}
							<div class="flex items-start gap-2 rounded-md px-2 py-1.5 {darkMode ? 'bg-slate-800/50' : 'bg-slate-50'}">
								<span class="shrink-0 text-xs font-medium {darkMode ? 'text-slate-300' : 'text-slate-700'}">
									{key}
								</span>
								<span class="text-xs break-all {darkMode ? 'text-slate-400' : 'text-slate-500'}">
									{typeof value === 'object' ? JSON.stringify(value) : String(value ?? '')}
								</span>
							</div>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Raw Output -->
			{#if executionResult}
				<div class="px-4 py-3">
					<button
						type="button"
						class="flex w-full items-center gap-1.5 text-xs font-semibold uppercase tracking-wider
							{darkMode ? 'text-slate-400 hover:text-slate-300' : 'text-slate-500 hover:text-slate-600'} transition-colors"
						onclick={() => rawResultOpen = !rawResultOpen}
					>
						<svg class="h-3 w-3 transition-transform {rawResultOpen ? 'rotate-90' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
						</svg>
						Raw Output
					</button>
					{#if rawResultOpen}
						<pre class="mt-2 max-h-64 overflow-auto rounded-md p-3 text-[11px] leading-relaxed
							{darkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-50 text-slate-600'}">{(() => {
								try { return JSON.stringify(JSON.parse(executionResult), null, 2); }
								catch { return executionResult; }
							})()}</pre>
					{/if}
				</div>
			{/if}

			{#if !executionStatus && !promptError}
				<div class="px-4 py-6 text-center">
					<p class="text-xs {darkMode ? 'text-slate-600' : 'text-slate-400'}">
						{linkedPrompt
							? 'Edit the prompt above and click "Run" to test.'
							: 'Configure a prompt and click "Save" to create it, then "Run" to test.'}
					</p>
				</div>
			{/if}

			{#if promptError}
				<div class="px-4 py-3">
					<div class="rounded-md p-2 text-xs {darkMode ? 'bg-red-900/20 text-red-400' : 'bg-red-50 text-red-600'}">
						{promptError}
					</div>
				</div>
			{/if}
		</div>
	{/if}
</div>
