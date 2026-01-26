<script lang="ts">
	import type { GridElement, AIQueryData } from '../../types';

	import type { PromptTemplate } from "@agnathan/types-simple"
	const {
		element = null,
		darkMode = false,
		prompt = '',
		model = 'gemini-3-flash-preview',
		systemPrompt = '',
		initialData,
		onSave,
		onCancel
	}: {
		element?: GridElement | null;
		darkMode?: boolean;
		prompt?: string;
		model?: string;
		systemPrompt?: string;
		initialData?: AIQueryData;
		onSave?: (data: AIQueryData) => void;
		onCancel?: () => void;
	} = $props();

	// Local state for bindable values (props are read-only in Svelte 5)
	let localPrompt = $state(prompt);
	let localModel = $state(model);
	let localSystemPrompt = $state(systemPrompt);

	// Update local state when props change
	$effect(() => {
		localPrompt = prompt;
		localModel = model;
		localSystemPrompt = systemPrompt;
	});

	// Schema Builder State
	let useSchema = $state(false);
	let schemaProperties = $state<Record<string, any>>({});
	let schemaRequired = $state<string[]>([]);
	let fieldOrder = $state<string[]>([]);

	// Initialize schema from initialData if present
	$effect(() => {
		if (initialData?.responseFormat?.type === 'json_schema' && initialData.responseFormat.schema) {
			useSchema = true;
			const schema = initialData.responseFormat.schema as any;
			if (schema.properties) {
				schemaProperties = { ...schema.properties };
				schemaRequired = schema.required ? [...schema.required] : [];
				fieldOrder = Object.keys(schema.properties);
			}
		}
	});

	// Derived array of field entries in correct order
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

	// Reactive schema preview
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
				'A step-by-step internal monologue explaining the logic and reasoning behind the values chosen for all other fields. This helps ensure accuracy and prevents skipping steps.';
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
		fieldOrder = [
			...fieldOrder.slice(0, oldIndex),
			newName,
			...fieldOrder.slice(oldIndex)
		];
		
		if (wasRequired) {
			schemaRequired = [...schemaRequired, newName];
		}
		schemaProperties = { ...schemaProperties };
	}

	function handleSave() {
		if (onSave) {
			const data: AIQueryData = {
				prompt: localPrompt,
				model: localModel,
				systemPrompt: localSystemPrompt || undefined
			};

			// Add schema if enabled and has properties
			if (useSchema && Object.keys(schemaProperties).length > 0) {
				data.responseFormat = {
					type: 'json_schema',
					schema: schemaPreview
				};
			}

			onSave(data);
		}
	}

	function handleCancel() {
		if (onCancel) {
			onCancel();
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			handleCancel();
		}
	}
</script>

{#if element}
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
			class="{darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4 border"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
			role="presentation"
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
							bind:value={localModel}
							class="w-full px-3 py-2.5 {darkMode ? 'bg-slate-700 text-white border-slate-600' : 'bg-white text-slate-900 border-slate-300'} rounded-md border focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
						>

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
							bind:value={localSystemPrompt}
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
							bind:value={localPrompt}
							placeholder="Analyze the following property data: {'{input}'}"
							class="w-full px-3 py-2.5 {darkMode ? 'bg-slate-700 text-white border-slate-600 placeholder-slate-500' : 'bg-white text-slate-900 border-slate-300'} rounded-md border focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none text-sm"
							rows="5"
						></textarea>
						<p class="text-xs {darkMode ? 'text-slate-400' : 'text-slate-500'} mt-1.5">Use {'{input}'} to insert data from connected nodes</p>
					</div>

					<!-- JSON Schema Builder Section -->
					<div class="rounded-md border {darkMode ? 'border-teal-600 bg-teal-900/30' : 'border-teal-300 bg-teal-50'} p-4">
						<div class="mb-4 flex items-center justify-between">
							<label class="flex items-center gap-2 cursor-pointer">
								<input
									type="checkbox"
									bind:checked={useSchema}
									class="cursor-pointer"
								/>
								<strong class="block {darkMode ? 'text-teal-200' : 'text-slate-900'}">Use JSON Schema for Structured Output</strong>
							</label>
						</div>

						{#if useSchema}
							<div class="space-y-4">
								<div>
									<div class="mb-2 flex items-center justify-between">
										<div class="block text-sm font-medium {darkMode ? 'text-slate-200' : 'text-slate-700'}">Schema Properties:</div>
										<div class="flex gap-2">
											<button
												onclick={() => addSchemaField(true)}
												class="rounded bg-amber-600 px-3 py-1 text-xs text-white hover:bg-amber-700 dark:bg-amber-700 dark:hover:bg-amber-800"
												title="Add reasoning field (best practice for AI)"
											>
												+ Reasoning
											</button>
											<button
												onclick={() => addSchemaField(false)}
												class="rounded bg-teal-600 px-3 py-1 text-xs text-white hover:bg-teal-700 dark:bg-teal-700 dark:hover:bg-teal-800"
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
																} else if (!newName || newName === '') {
																	e.currentTarget.value = fieldName;
																}
															}}
															onkeydown={(e) => {
																if (e.key === 'Enter') {
																	e.currentTarget.blur();
																}
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
														onclick={() => removeSchemaField(fieldName)}
														class="rounded bg-red-500 px-2 py-1 text-xs text-white hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700"
													>
														Remove
													</button>
												</div>

												<!-- Description -->
												<div class="mb-2">
													<div class="mb-1 block text-xs font-medium {darkMode ? 'text-slate-300' : 'text-gray-700'}">
														Description <span class="text-red-500 dark:text-red-400">*</span>
													</div>
													<textarea
														value={fieldSchema.description || ''}
														oninput={(e) =>
															updateSchemaField(fieldName, { description: e.currentTarget.value })}
														placeholder="Clear instruction explaining what this field represents and any constraints..."
														class="w-full rounded border {darkMode ? 'border-gray-600 bg-slate-700 text-slate-100' : 'border-gray-200 bg-white text-slate-900'} px-2 py-1 text-xs"
														rows="2"
													></textarea>
													<p class="mt-1 text-xs {darkMode ? 'text-gray-400' : 'text-gray-500'}">
														Write as if giving direct instructions to the AI model
													</p>
												</div>

												<!-- Enum (for string types) -->
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
															placeholder="e.g., low, medium, high, urgent"
															class="w-full rounded border {darkMode ? 'border-gray-600 bg-slate-700 text-slate-100' : 'border-gray-200 bg-white text-slate-900'} px-2 py-1 text-xs"
														/>
														<p class="mt-1 text-xs {darkMode ? 'text-gray-400' : 'text-gray-500'}">
															Force the model to pick from a fixed list (prevents synonyms)
														</p>
													</div>

													<!-- Pattern -->
													<div class="mb-2">
														<div class="mb-1 block text-xs font-medium {darkMode ? 'text-slate-300' : 'text-gray-700'}">Pattern (Regex)</div>
														<input
															type="text"
															value={fieldSchema.pattern || ''}
															oninput={(e) => {
																const value = e.currentTarget.value.trim();
																if (value) {
																	updateSchemaField(fieldName, { pattern: value });
																} else {
																	const updated = { ...fieldSchema };
																	delete updated.pattern;
																	updateSchemaField(fieldName, updated);
																}
															}}
															placeholder="e.g., ^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$"
															class="w-full rounded border {darkMode ? 'border-gray-600 bg-slate-700 text-slate-100' : 'border-gray-200 bg-white text-slate-900'} px-2 py-1 text-xs font-mono"
														/>
														<p class="mt-1 text-xs {darkMode ? 'text-gray-400' : 'text-gray-500'}">
															Regex pattern for format validation (e.g., dates, hex codes, phone numbers)
														</p>
													</div>
												{/if}

												<!-- Minimum/Maximum (for number/integer) -->
												{#if fieldSchema.type === 'number' || fieldSchema.type === 'integer'}
													<div class="mb-2 grid grid-cols-2 gap-2">
														<div>
															<div class="mb-1 block text-xs font-medium {darkMode ? 'text-slate-300' : 'text-gray-700'}">Minimum</div>
															<input
																type="number"
																value={fieldSchema.minimum ?? ''}
																oninput={(e) => {
																	const value = e.currentTarget.value;
																	updateSchemaField(
																		fieldName,
																		value ? { minimum: Number(value) } : { minimum: undefined }
																	);
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
																	updateSchemaField(
																		fieldName,
																		value ? { maximum: Number(value) } : { maximum: undefined }
																	);
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
												No properties yet. Click "+ Reasoning" (best practice) or "+ Add Field" to get started.
											</p>
										{/if}
									</div>
								</div>

								<!-- Schema Preview -->
								<div class="rounded-md border {darkMode ? 'border-teal-700 bg-teal-900/30' : 'border-teal-200 bg-teal-100'} p-3">
									<strong class="mb-2 block text-sm {darkMode ? 'text-teal-200' : 'text-slate-900'}">Schema Preview:</strong>
									<pre class="max-h-48 overflow-auto text-xs {darkMode ? 'text-slate-200' : 'text-slate-700'}">{JSON.stringify(schemaPreview, null, 2)}</pre>
								</div>
							</div>
						{/if}
					</div>
				</div>

				<div class="flex gap-3 mt-8 pt-6 {darkMode ? 'border-slate-700' : 'border-slate-200'} border-t">
					{#if onSave}
						<button
							onclick={handleSave}
							class="flex-1 px-4 py-2.5 {darkMode ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-slate-900 hover:bg-slate-800'} text-white rounded-md transition-colors font-semibold text-sm shadow-sm hover:shadow"
						>
							Save Configuration
						</button>
					{/if}
					{#if onCancel}
						<button
							onclick={handleCancel}
							class="flex-1 px-4 py-2.5 {darkMode ? 'bg-slate-700 hover:bg-slate-600 text-slate-200 border-slate-600' : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'} rounded-md transition-colors font-semibold text-sm border"
						>
							Cancel
						</button>
					{/if}
				</div>
			</div>
		</div>
	</div>
{/if}
