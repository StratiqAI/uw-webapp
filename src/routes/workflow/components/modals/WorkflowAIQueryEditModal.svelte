<script lang="ts">
	import type { GridElement, AIQueryData } from '../../types';
	import { isAINode } from '../../types/node';
	import WorkflowModal from './WorkflowModal.svelte';

	let {
		darkMode = false,
		editingAIQuery = $bindable(null),
		onSave,
		onClose
	}: {
		darkMode?: boolean;
		editingAIQuery?: GridElement | null;
		onSave?: () => void;
		onClose?: () => void;
	} = $props();

	// Basic fields
	let aiQueryModel = $state('gpt-4o');
	let aiQuerySystemPrompt = $state('');
	let aiQueryPrompt = $state('');

	// Advanced fields - Model Parameters
	let temperature = $state<number | undefined>(undefined);
	let maxTokens = $state<number | undefined>(undefined);
	let topP = $state<number | undefined>(undefined);
	let frequencyPenalty = $state<number | undefined>(undefined);
	let presencePenalty = $state<number | undefined>(undefined);
	let stopSequences = $state<string>('');

	// Advanced fields - Response Format
	let responseFormatType = $state<'text' | 'json_object' | 'json_schema'>('text');
	let jsonSchemaText = $state('');

	// Advanced fields - Options
	let stream = $state(false);
	let user = $state('');
	let seed = $state<number | undefined>(undefined);
	let logitBiasText = $state('');

	// Advanced fields - Metadata
	let metadataText = $state('');

	// UI state
	let showAdvanced = $state(false);
	let previousEditingAIQuery = $state<GridElement | null>(null);

	$effect(() => {
		if (editingAIQuery) {
			const data = editingAIQuery.aiQueryData;
			let defaults: AIQueryData | undefined;
			if (isAINode(editingAIQuery.type)) {
				defaults = editingAIQuery.type.defaultAIQueryData;
			}

			// Check if this is a new query being edited (different from previous)
			const isNewQuery = editingAIQuery !== previousEditingAIQuery;
			previousEditingAIQuery = editingAIQuery;

			// Basic fields
			aiQueryPrompt = data?.prompt ?? defaults?.prompt ?? '';
			aiQueryModel = data?.model ?? defaults?.model ?? 'gpt-4o';
			aiQuerySystemPrompt = data?.systemPrompt ?? defaults?.systemPrompt ?? '';

			// Advanced fields - Model Parameters
			temperature = data?.temperature ?? defaults?.temperature;
			maxTokens = data?.maxTokens ?? defaults?.maxTokens;
			topP = data?.topP ?? defaults?.topP;
			frequencyPenalty = data?.frequencyPenalty ?? defaults?.frequencyPenalty;
			presencePenalty = data?.presencePenalty ?? defaults?.presencePenalty;
			stopSequences = Array.isArray(data?.stop)
				? data.stop.join(', ')
				: data?.stop ?? (defaults?.stop
					? (Array.isArray(defaults.stop) ? defaults.stop.join(', ') : defaults.stop)
					: '');

			// Advanced fields - Response Format
			if (data?.responseFormat) {
				responseFormatType = data.responseFormat.type;
				if (data.responseFormat.type === 'json_schema' && 'schema' in data.responseFormat) {
					jsonSchemaText = JSON.stringify(data.responseFormat.schema, null, 2);
				}
			} else if (defaults?.responseFormat) {
				responseFormatType = defaults.responseFormat.type;
				if (defaults.responseFormat.type === 'json_schema' && 'schema' in defaults.responseFormat) {
					jsonSchemaText = JSON.stringify(defaults.responseFormat.schema, null, 2);
				}
			}

			// Advanced fields - Options
			stream = data?.stream ?? defaults?.stream ?? false;
			user = data?.user ?? defaults?.user ?? '';
			seed = data?.seed ?? defaults?.seed;
			logitBiasText = data?.logitBias
				? JSON.stringify(data.logitBias, null, 2)
				: defaults?.logitBias
					? JSON.stringify(defaults.logitBias, null, 2)
					: '';

			// Advanced fields - Metadata
			metadataText = data?.metadata
				? JSON.stringify(data.metadata, null, 2)
				: defaults?.metadata
					? JSON.stringify(defaults.metadata, null, 2)
					: '';

			// Only set showAdvanced on initial load (when it's a new query)
			// Once the user opens/closes it, respect their choice
			if (isNewQuery) {
				showAdvanced = Boolean(
					temperature !== undefined ||
						maxTokens !== undefined ||
						topP !== undefined ||
						frequencyPenalty !== undefined ||
						presencePenalty !== undefined ||
						stopSequences ||
						responseFormatType !== 'text' ||
						stream ||
						user ||
						seed !== undefined ||
						logitBiasText ||
						metadataText
				);
			}
		} else {
			// Reset all fields
			aiQueryPrompt = '';
			aiQueryModel = 'gpt-4o';
			aiQuerySystemPrompt = '';
			temperature = undefined;
			maxTokens = undefined;
			topP = undefined;
			frequencyPenalty = undefined;
			presencePenalty = undefined;
			stopSequences = '';
			responseFormatType = 'text';
			jsonSchemaText = '';
			stream = false;
			user = '';
			seed = undefined;
			logitBiasText = '';
			metadataText = '';
			showAdvanced = false;
			previousEditingAIQuery = null;
		}
	});

	function saveAIQuery() {
		if (!editingAIQuery) return;

		const aiQueryData: AIQueryData = {
			model: aiQueryModel,
			prompt: aiQueryPrompt,
			...(aiQuerySystemPrompt && { systemPrompt: aiQuerySystemPrompt })
		};

		// Add advanced fields if they have values
		if (temperature !== undefined) aiQueryData.temperature = temperature;
		if (maxTokens !== undefined) aiQueryData.maxTokens = maxTokens;
		if (topP !== undefined) aiQueryData.topP = topP;
		if (frequencyPenalty !== undefined) aiQueryData.frequencyPenalty = frequencyPenalty;
		if (presencePenalty !== undefined) aiQueryData.presencePenalty = presencePenalty;
		if (stopSequences.trim()) {
			const stopArray = stopSequences.split(',').map((s) => s.trim()).filter(Boolean);
			aiQueryData.stop = stopArray.length === 1 ? stopArray[0] : stopArray;
		}

		// Response format
		if (responseFormatType !== 'text') {
			if (responseFormatType === 'json_object') {
				aiQueryData.responseFormat = { type: 'json_object' };
			} else if (responseFormatType === 'json_schema' && jsonSchemaText.trim()) {
				try {
					const schema = JSON.parse(jsonSchemaText);
					aiQueryData.responseFormat = { type: 'json_schema', schema };
				} catch (e) {
					console.error('Invalid JSON schema:', e);
				}
			}
		}

		// Options
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

		editingAIQuery.aiQueryData = aiQueryData;
		editingAIQuery = null;
		onSave?.();
	}

	function cancelEditAIQuery() {
		editingAIQuery = null;
		onClose?.();
	}
</script>

<WorkflowModal
	{darkMode}
	labelledBy="modal-title"
	maxWidthClass="max-w-4xl"
	maxHeightClass="max-h-[90vh]"
	containerClass="overflow-y-auto"
	{onClose}
>
	<div class="p-6">
		<div class="flex items-center gap-3 mb-6 pb-4 {darkMode ? 'border-slate-700' : 'border-slate-200'} border-b">
			<div class="w-10 h-10 {darkMode ? 'bg-indigo-900' : 'bg-indigo-100'} rounded-lg flex items-center justify-center">
				<span class="{darkMode ? 'text-indigo-300' : 'text-indigo-600'} font-bold text-sm">AI</span>
			</div>
			<div>
				<h2 id="modal-title" class="text-xl font-semibold {darkMode ? 'text-white' : 'text-slate-900'}">
					Configure AI Analysis
				</h2>
				<p class="text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'} mt-0.5">Set up AI processing parameters</p>
			</div>
		</div>

		<div class="space-y-5">
			<div>
				<label for="ai-model-select" class="block text-sm font-semibold {darkMode ? 'text-slate-200' : 'text-slate-700'} mb-2">
					AI Model
				</label>
				<select
					id="ai-model-select"
					bind:value={aiQueryModel}
					class="w-full px-3 py-2.5 {darkMode ? 'bg-slate-700 text-white border-slate-600' : 'bg-white text-slate-900 border-slate-300'} rounded-md border focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
				>
					<option value="gpt-4o">GPT-4o</option>
					<option value="gpt-4o-mini">GPT-4o Mini</option>
					<option value="gpt-4-turbo">GPT-4 Turbo</option>
					<option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
					<option value="gemini-3-flash-preview">Gemini 3 Flash Preview</option>
					<option value="gemini-3-pro-preview">Gemini 3 Pro Preview</option>
				</select>
			</div>

			<div>
				<label for="ai-system-prompt" class="block text-sm font-semibold {darkMode ? 'text-slate-200' : 'text-slate-700'} mb-2">
					Context Instructions <span class="{darkMode ? 'text-slate-500' : 'text-slate-400'} font-normal">(Optional)</span>
				</label>
				<textarea
					id="ai-system-prompt"
					bind:value={aiQuerySystemPrompt}
					placeholder="You are an expert commercial real estate analyst..."
					class="w-full px-3 py-2.5 {darkMode ? 'bg-slate-700 text-white border-slate-600 placeholder-slate-500' : 'bg-white text-slate-900 border-slate-300'} rounded-md border focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none text-sm"
					rows="3"
				></textarea>
				<p class="text-xs {darkMode ? 'text-slate-400' : 'text-slate-500'} mt-1.5">Provide context about the AI's role and expertise</p>
			</div>

			<div>
				<label for="ai-user-prompt" class="block text-sm font-semibold {darkMode ? 'text-slate-200' : 'text-slate-700'} mb-2">
					Analysis Prompt
				</label>
				<textarea
					id="ai-user-prompt"
					bind:value={aiQueryPrompt}
					placeholder="Analyze the following property data: {'{input}'}"
					class="w-full px-3 py-2.5 {darkMode ? 'bg-slate-700 text-white border-slate-600 placeholder-slate-500' : 'bg-white text-slate-900 border-slate-300'} rounded-md border focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none text-sm"
					rows="5"
				></textarea>
				<p class="text-xs {darkMode ? 'text-slate-400' : 'text-slate-500'} mt-1.5">Use {'{input}'} to insert data from connected nodes</p>
			</div>
		</div>

		<!-- Advanced Options Section -->
		<div class="mt-6 pt-6 {darkMode ? 'border-slate-700' : 'border-slate-200'} border-t">
			<button
				type="button"
				onclick={() => (showAdvanced = !showAdvanced)}
				class="w-full flex items-center justify-between text-left py-2 {darkMode ? 'text-slate-300 hover:text-white' : 'text-slate-700 hover:text-slate-900'} transition-colors"
			>
				<span class="text-sm font-semibold">Advanced Options</span>
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
					<!-- Model Parameters -->
					<div>
						<h3 class="text-xs font-semibold {darkMode ? 'text-slate-400' : 'text-slate-500'} uppercase tracking-wide mb-3">
							Model Parameters
						</h3>
						<div class="grid grid-cols-2 gap-4">
							<div>
								<label
									for="temperature"
									class="block text-sm font-medium {darkMode ? 'text-slate-300' : 'text-slate-700'} mb-1.5"
								>
									Temperature <span class="text-xs font-normal">(0-2)</span>
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
								<label
									for="max-tokens"
									class="block text-sm font-medium {darkMode ? 'text-slate-300' : 'text-slate-700'} mb-1.5"
								>
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
								<label
									for="top-p"
									class="block text-sm font-medium {darkMode ? 'text-slate-300' : 'text-slate-700'} mb-1.5"
								>
									Top P <span class="text-xs font-normal">(0-1)</span>
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
								<label
									for="frequency-penalty"
									class="block text-sm font-medium {darkMode ? 'text-slate-300' : 'text-slate-700'} mb-1.5"
								>
									Frequency Penalty <span class="text-xs font-normal">(-2.0 to 2.0)</span>
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
							<div>
								<label
									for="presence-penalty"
									class="block text-sm font-medium {darkMode ? 'text-slate-300' : 'text-slate-700'} mb-1.5"
								>
									Presence Penalty <span class="text-xs font-normal">(-2.0 to 2.0)</span>
								</label>
								<input
									type="number"
									id="presence-penalty"
									bind:value={presencePenalty}
									min="-2"
									max="2"
									step="0.1"
									placeholder="0"
									class="w-full px-3 py-2 {darkMode ? 'bg-slate-700 text-white border-slate-600 placeholder-slate-500' : 'bg-white text-slate-900 border-slate-300'} rounded-md border focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
								/>
							</div>
						</div>
						<div class="mt-4">
							<label
								for="stop-sequences"
								class="block text-sm font-medium {darkMode ? 'text-slate-300' : 'text-slate-700'} mb-1.5"
							>
								Stop Sequences <span class="text-xs font-normal">(comma-separated)</span>
							</label>
							<input
								type="text"
								id="stop-sequences"
								bind:value={stopSequences}
								placeholder="Stop, END, [END]"
								class="w-full px-3 py-2 {darkMode ? 'bg-slate-700 text-white border-slate-600 placeholder-slate-500' : 'bg-white text-slate-900 border-slate-300'} rounded-md border focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
							/>
						</div>
					</div>

					<!-- Response Format -->
					<div>
						<h3 class="text-xs font-semibold {darkMode ? 'text-slate-400' : 'text-slate-500'} uppercase tracking-wide mb-3">
							Response Format
						</h3>
						<div>
							<label
								for="response-format"
								class="block text-sm font-medium {darkMode ? 'text-slate-300' : 'text-slate-700'} mb-1.5"
							>
								Format Type
							</label>
							<select
								id="response-format"
								bind:value={responseFormatType}
								class="w-full px-3 py-2 {darkMode ? 'bg-slate-700 text-white border-slate-600' : 'bg-white text-slate-900 border-slate-300'} rounded-md border focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
							>
								<option value="text">Text (Default)</option>
								<option value="json_object">JSON Object</option>
								<option value="json_schema">JSON Schema</option>
							</select>
						</div>
						{#if responseFormatType === 'json_schema'}
							<div class="mt-3">
								<label
									for="json-schema"
									class="block text-sm font-medium {darkMode ? 'text-slate-300' : 'text-slate-700'} mb-1.5"
								>
									JSON Schema
								</label>
								<textarea
									id="json-schema"
									bind:value={jsonSchemaText}
									placeholder="JSON schema object"
									class="w-full px-3 py-2 font-mono text-xs {darkMode ? 'bg-slate-700 text-white border-slate-600 placeholder-slate-500' : 'bg-white text-slate-900 border-slate-300'} rounded-md border focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
									rows="6"
								></textarea>
								<p class="text-xs {darkMode ? 'text-slate-400' : 'text-slate-500'} mt-1.5">
									Enter a valid JSON schema object
								</p>
							</div>
						{/if}
					</div>

					<!-- Advanced Options -->
					<div>
						<h3 class="text-xs font-semibold {darkMode ? 'text-slate-400' : 'text-slate-500'} uppercase tracking-wide mb-3">
							Advanced Options
						</h3>
						<div class="space-y-4">
							<div class="flex items-center gap-3">
								<input
									type="checkbox"
									id="stream"
									bind:checked={stream}
									class="w-4 h-4 {darkMode ? 'accent-indigo-600' : 'accent-indigo-600'} rounded border-slate-300"
								/>
								<label for="stream" class="text-sm {darkMode ? 'text-slate-300' : 'text-slate-700'}">
									Enable Streaming
								</label>
							</div>
							<div>
								<label
									for="user-id"
									class="block text-sm font-medium {darkMode ? 'text-slate-300' : 'text-slate-700'} mb-1.5"
								>
									User ID <span class="text-xs font-normal">(for tracking)</span>
								</label>
								<input
									type="text"
									id="user-id"
									bind:value={user}
									placeholder="optional"
									class="w-full px-3 py-2 {darkMode ? 'bg-slate-700 text-white border-slate-600 placeholder-slate-500' : 'bg-white text-slate-900 border-slate-300'} rounded-md border focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
								/>
							</div>
							<div>
								<label
									for="seed"
									class="block text-sm font-medium {darkMode ? 'text-slate-300' : 'text-slate-700'} mb-1.5"
								>
									Seed <span class="text-xs font-normal">(for deterministic outputs)</span>
								</label>
								<input
									type="number"
									id="seed"
									bind:value={seed}
									placeholder="optional"
									class="w-full px-3 py-2 {darkMode ? 'bg-slate-700 text-white border-slate-600 placeholder-slate-500' : 'bg-white text-slate-900 border-slate-300'} rounded-md border focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
								/>
							</div>
							<div>
								<label
									for="logit-bias"
									class="block text-sm font-medium {darkMode ? 'text-slate-300' : 'text-slate-700'} mb-1.5"
								>
									Logit Bias <span class="text-xs font-normal">(JSON object)</span>
								</label>
								<textarea
									id="logit-bias"
									bind:value={logitBiasText}
									placeholder="Token bias values (JSON)"
									class="w-full px-3 py-2 font-mono text-xs {darkMode ? 'bg-slate-700 text-white border-slate-600 placeholder-slate-500' : 'bg-white text-slate-900 border-slate-300'} rounded-md border focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
									rows="3"
								></textarea>
							</div>
							<div>
								<label
									for="metadata"
									class="block text-sm font-medium {darkMode ? 'text-slate-300' : 'text-slate-700'} mb-1.5"
								>
									Metadata <span class="text-xs font-normal">(JSON object)</span>
								</label>
								<textarea
									id="metadata"
									bind:value={metadataText}
									placeholder="Custom metadata (JSON)"
									class="w-full px-3 py-2 font-mono text-xs {darkMode ? 'bg-slate-700 text-white border-slate-600 placeholder-slate-500' : 'bg-white text-slate-900 border-slate-300'} rounded-md border focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
									rows="3"
								></textarea>
							</div>
						</div>
					</div>
				</div>
			{/if}
		</div>

		<div class="flex gap-3 mt-8 pt-6 {darkMode ? 'border-slate-700' : 'border-slate-200'} border-t">
			<button
				onclick={saveAIQuery}
				class="flex-1 px-4 py-2.5 {darkMode ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-slate-900 hover:bg-slate-800'} text-white rounded-md transition-colors font-semibold text-sm shadow-sm hover:shadow"
			>
				Save Configuration
			</button>
			<button
				onclick={cancelEditAIQuery}
				class="flex-1 px-4 py-2.5 {darkMode ? 'bg-slate-700 hover:bg-slate-600 text-slate-200 border-slate-600' : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'} rounded-md transition-colors font-semibold text-sm border"
			>
				Cancel
			</button>
		</div>
	</div>
</WorkflowModal>
