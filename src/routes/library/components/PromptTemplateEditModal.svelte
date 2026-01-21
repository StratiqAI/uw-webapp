<script lang="ts">
	import type { PromptTemplate } from '@stratiqai/types-simple';
	import { parseTemplateToAIQueryData, type AIQueryData } from '../libraryService';

	let {
		darkMode = false,
		template = null,
		isCreating = false,
		onSave,
		onCancel
	}: {
		darkMode?: boolean;
		template?: PromptTemplate | null;
		isCreating?: boolean;
		onSave?: (data: { name: string; description: string; aiQueryData: AIQueryData }) => void;
		onCancel?: () => void;
	} = $props();

	// Template metadata fields
	let templateName = $state('');
	let templateDescription = $state('');

	// Basic AI query fields
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

	// Schema Builder State
	let schemaProperties = $state<Record<string, any>>({});
	let schemaRequired = $state<string[]>([]);
	let fieldOrder = $state<string[]>([]);
	let useSchemaBuilder = $state(false);

	// Advanced fields - Options
	let stream = $state(false);
	let user = $state('');
	let seed = $state<number | undefined>(undefined);
	let logitBiasText = $state('');
	let metadataText = $state('');

	// UI state
	let showAdvanced = $state(false);

	// Initialize form from template or defaults
	$effect(() => {
		if (template) {
			templateName = template.name || '';
			templateDescription = template.description || '';

			const data = parseTemplateToAIQueryData(template.template);

			aiQueryPrompt = data.prompt || '';
			aiQueryModel = data.model || 'gpt-4o';
			aiQuerySystemPrompt = data.systemPrompt || '';

			temperature = data.temperature;
			maxTokens = data.maxTokens;
			topP = data.topP;
			frequencyPenalty = data.frequencyPenalty;
			presencePenalty = data.presencePenalty;
			stopSequences = Array.isArray(data.stop)
				? data.stop.join(', ')
				: data.stop ?? '';

			if (data.responseFormat) {
				responseFormatType = data.responseFormat.type;
				if (data.responseFormat.type === 'json_schema' && data.responseFormat.schema) {
					const schema = data.responseFormat.schema as any;
					jsonSchemaText = JSON.stringify(schema, null, 2);
					if (schema.properties) {
						schemaProperties = { ...schema.properties };
						schemaRequired = schema.required ? [...schema.required] : [];
						fieldOrder = Object.keys(schema.properties);
						useSchemaBuilder = true;
					}
				}
			} else {
				responseFormatType = 'text';
				schemaProperties = {};
				schemaRequired = [];
				fieldOrder = [];
				useSchemaBuilder = false;
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
			aiQueryModel = 'gpt-4o';
			aiQuerySystemPrompt = 'You are a helpful AI assistant.';
			temperature = undefined;
			maxTokens = undefined;
			topP = undefined;
			frequencyPenalty = undefined;
			presencePenalty = undefined;
			stopSequences = '';
			responseFormatType = 'text';
			jsonSchemaText = '';
			schemaProperties = {};
			schemaRequired = [];
			fieldOrder = [];
			useSchemaBuilder = false;
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

	function handleSave() {
		if (!templateName.trim()) {
			alert('Please enter a template name');
			return;
		}

		const aiQueryData: AIQueryData = {
			model: aiQueryModel,
			prompt: aiQueryPrompt
		};

		if (aiQuerySystemPrompt) aiQueryData.systemPrompt = aiQuerySystemPrompt;
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
				if (useSchemaBuilder && Object.keys(schemaProperties).length > 0) {
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

		onSave?.({
			name: templateName.trim(),
			description: templateDescription.trim(),
			aiQueryData
		});
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
							{isCreating ? 'Create New Query' : 'Edit Query'}
						</h2>
						<p class="text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'} mt-0.5">Configure your AI analysis query</p>
					</div>
				</div>

				<div class="space-y-5">
					<!-- Template Name -->
					<div>
						<label for="template-name" class="block text-sm font-semibold {darkMode ? 'text-slate-200' : 'text-slate-700'} mb-2">
							Query Name <span class="text-red-500">*</span>
						</label>
						<input
							id="template-name"
							type="text"
							bind:value={templateName}
							placeholder="e.g., Property Analysis, Market Research"
							class="w-full px-3 py-2.5 {darkMode ? 'bg-slate-700 text-white border-slate-600 placeholder-slate-500' : 'bg-white text-slate-900 border-slate-300'} rounded-md border focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
						/>
					</div>

					<!-- Template Description -->
					<div>
						<label for="template-description" class="block text-sm font-semibold {darkMode ? 'text-slate-200' : 'text-slate-700'} mb-2">
							Description <span class="{darkMode ? 'text-slate-500' : 'text-slate-400'} font-normal">(Optional)</span>
						</label>
						<input
							id="template-description"
							type="text"
							bind:value={templateDescription}
							placeholder="Brief description of what this query does"
							class="w-full px-3 py-2.5 {darkMode ? 'bg-slate-700 text-white border-slate-600 placeholder-slate-500' : 'bg-white text-slate-900 border-slate-300'} rounded-md border focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
						/>
					</div>

					<hr class="{darkMode ? 'border-slate-700' : 'border-slate-200'}" />

					<!-- AI Model -->
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

					<!-- System Prompt -->
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

					<!-- User Prompt -->
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

					<!-- Response Format -->
					<div>
						<h3 class="text-xs font-semibold {darkMode ? 'text-slate-400' : 'text-slate-500'} uppercase tracking-wide mb-3">
							Response Format
						</h3>
						<div>
							<label for="response-format" class="block text-sm font-medium {darkMode ? 'text-slate-300' : 'text-slate-700'} mb-1.5">
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
							<div class="mt-3 space-y-3">
								<div class="flex items-center gap-3">
									<label class="flex items-center gap-2 cursor-pointer">
										<input type="checkbox" bind:checked={useSchemaBuilder} class="cursor-pointer" />
										<span class="text-sm {darkMode ? 'text-slate-300' : 'text-slate-700'}">
											Use Visual Schema Builder
										</span>
									</label>
								</div>

								{#if useSchemaBuilder}
									<div class="rounded-md border {darkMode ? 'border-teal-600 bg-teal-900/30' : 'border-teal-300 bg-teal-50'} p-4">
										<div class="mb-4">
											<div class="mb-2 flex items-center justify-between">
												<div class="block text-sm font-medium {darkMode ? 'text-slate-200' : 'text-slate-700'}">Schema Properties:</div>
												<div class="flex gap-2">
													<button
														type="button"
														onclick={() => addSchemaField(true)}
														class="rounded bg-amber-600 px-3 py-1 text-xs text-white hover:bg-amber-700"
														title="Add reasoning field (best practice for AI)"
													>
														+ Reasoning
													</button>
													<button
														type="button"
														onclick={() => addSchemaField(false)}
														class="rounded bg-teal-600 px-3 py-1 text-xs text-white hover:bg-teal-700"
													>
														+ Add Field
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
																	placeholder="Field name"
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
																Description <span class="text-red-500">*</span>
															</div>
															<textarea
																value={fieldSchema.description || ''}
																oninput={(e) => updateSchemaField(fieldName, { description: e.currentTarget.value })}
																placeholder="Clear instruction explaining what this field represents..."
																class="w-full rounded border {darkMode ? 'border-gray-600 bg-slate-700 text-slate-100' : 'border-gray-200 bg-white text-slate-900'} px-2 py-1 text-xs"
																rows="2"
															></textarea>
														</div>
														{#if fieldSchema.type === 'string'}
															<div class="mb-2">
																<div class="mb-1 block text-xs font-medium {darkMode ? 'text-slate-300' : 'text-gray-700'}">
																	Enum Values (comma-separated)
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
														No properties yet. Click "+ Reasoning" or "+ Add Field" to get started.
													</p>
												{/if}
											</div>
										</div>
										<div class="rounded-md border {darkMode ? 'border-teal-700 bg-teal-900/30' : 'border-teal-200 bg-teal-100'} p-3">
											<strong class="mb-2 block text-sm {darkMode ? 'text-teal-200' : 'text-slate-900'}">Schema Preview:</strong>
											<pre class="max-h-48 overflow-auto text-xs {darkMode ? 'text-slate-200' : 'text-slate-700'}">{JSON.stringify(schemaPreview, null, 2)}</pre>
										</div>
									</div>
								{:else}
									<div>
										<label for="json-schema" class="block text-sm font-medium {darkMode ? 'text-slate-300' : 'text-slate-700'} mb-1.5">
											JSON Schema
										</label>
										<textarea
											id="json-schema"
											bind:value={jsonSchemaText}
											placeholder="JSON schema object"
											class="w-full px-3 py-2 font-mono text-xs {darkMode ? 'bg-slate-700 text-white border-slate-600 placeholder-slate-500' : 'bg-white text-slate-900 border-slate-300'} rounded-md border focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
											rows="6"
										></textarea>
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
							<div>
								<h3 class="text-xs font-semibold {darkMode ? 'text-slate-400' : 'text-slate-500'} uppercase tracking-wide mb-3">
									Model Parameters
								</h3>
								<div class="grid grid-cols-2 gap-4">
									<div>
										<label for="temperature" class="block text-sm font-medium {darkMode ? 'text-slate-300' : 'text-slate-700'} mb-1.5">
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
						</div>
					{/if}
				</div>

				<!-- Footer -->
				<div class="flex gap-3 mt-8 pt-6 {darkMode ? 'border-slate-700' : 'border-slate-200'} border-t">
					<button
						onclick={handleSave}
						class="flex-1 px-4 py-2.5 {darkMode ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-slate-900 hover:bg-slate-800'} text-white rounded-md transition-colors font-semibold text-sm shadow-sm hover:shadow"
					>
						{isCreating ? 'Create Query' : 'Save Changes'}
					</button>
					<button
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
