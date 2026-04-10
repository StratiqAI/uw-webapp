<script lang="ts">
	import type {
		NestedItemSchema,
		NestedSchemaNodeType,
		NestedSchemaPropertyNode
	} from './promptSchemaTypes.js';
	import {
		newNestedId,
		extractPromptVariables,
		getOrderedFieldEntries,
		addSchemaField as addField,
		removeSchemaField as removeField,
		updateSchemaField as patchField,
		updateSchemaFieldType as changeFieldType,
		toggleSchemaFieldRequired as toggleReq,
		renameSchemaField,
		buildSchemaPreview,
		parseJsonSchemaToBuilderState,
		type SchemaBuilderState
	} from './promptUtils.js';
	import SchemaNodesEditor from './SchemaNodesEditor.svelte';

	interface Props {
		darkMode?: boolean;

		promptName?: string;
		promptDescription?: string;

		userPrompt?: string;
		systemInstruction?: string;
		model?: string;

		responseFormatType?: 'text' | 'json_object' | 'json_schema';
		schemaProperties?: Record<string, Record<string, unknown>>;
		schemaRequired?: string[];
		fieldOrder?: string[];

		googleSearchEnabled?: boolean;

		hideResponseFormat?: boolean;

		isGenerating?: boolean;
		generateError?: string;
		isSaving?: boolean;

		onGenerate?: () => void;
		onSave?: () => void | Promise<void>;
		onLoadSchemaFromLibrary?: () => void;

		temperature?: number;
		maxTokens?: number;
		topP?: number;
		frequencyPenalty?: number;
		stopSequences?: string;
	}

	let {
		darkMode = false,
		promptName = $bindable(''),
		promptDescription = $bindable(''),
		userPrompt = $bindable(''),
		systemInstruction = $bindable(''),
		model = $bindable(''),
		responseFormatType = $bindable('json_schema'),
		schemaProperties = $bindable({}),
		schemaRequired = $bindable([]),
		fieldOrder = $bindable([]),
		googleSearchEnabled = $bindable(true),
		hideResponseFormat = false,
		isGenerating = false,
		generateError = '',
		isSaving = false,
		onGenerate,
		onSave,
		onLoadSchemaFromLibrary,
		temperature = $bindable(undefined),
		maxTokens = $bindable(undefined),
		topP = $bindable(undefined),
		frequencyPenalty = $bindable(undefined),
		stopSequences = $bindable('')
	}: Props = $props();

	let showPasteJson = $state(false);
	let pasteJsonText = $state('');
	let pasteJsonError = $state('');
	let showSystemInstruction = $state(false);

	$effect(() => {
		if (systemInstruction) showSystemInstruction = true;
	});

	function toggleGoogleSearch() {
		googleSearchEnabled = !googleSearchEnabled;
		if (googleSearchEnabled && responseFormatType !== 'text') {
			responseFormatType = 'text';
		}
	}

	let promptInputVariables = $derived(extractPromptVariables(userPrompt));

	let orderedFieldEntries = $derived(getOrderedFieldEntries(schemaProperties, fieldOrder));

	let schemaPreview = $derived(buildSchemaPreview(schemaProperties, schemaRequired));

	function handleAddField(isReasoning = false) {
		const state: SchemaBuilderState = { properties: schemaProperties, fieldOrder, required: schemaRequired };
		const next = addField(state, isReasoning);
		schemaProperties = next.properties;
		fieldOrder = next.fieldOrder;
		schemaRequired = next.required;
	}

	function handleRemoveField(fieldName: string) {
		const state: SchemaBuilderState = { properties: schemaProperties, fieldOrder, required: schemaRequired };
		const next = removeField(state, fieldName);
		schemaProperties = next.properties;
		fieldOrder = next.fieldOrder;
		schemaRequired = next.required;
	}

	function handleUpdateField(fieldName: string, updates: Record<string, unknown>) {
		schemaProperties = patchField(schemaProperties, fieldName, updates);
	}

	function handleUpdateFieldType(fieldName: string, type: string) {
		schemaProperties = changeFieldType(schemaProperties, fieldName, type);
	}

	function handleToggleRequired(fieldName: string) {
		schemaRequired = toggleReq(schemaRequired, fieldName);
	}

	function handleRenameField(oldName: string, newName: string) {
		const state: SchemaBuilderState = { properties: schemaProperties, fieldOrder, required: schemaRequired };
		const result = renameSchemaField(state, oldName, newName);
		if (result.error) return;
		schemaProperties = result.properties;
		fieldOrder = result.fieldOrder;
		schemaRequired = result.required;
	}

	function handlePasteJsonApply() {
		pasteJsonError = '';
		const text = pasteJsonText.trim();
		if (!text) { pasteJsonError = 'Please paste a JSON schema'; return; }
		try {
			const parsed = JSON.parse(text);
			if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
				pasteJsonError = 'Must be a JSON object';
				return;
			}
			const state = parseJsonSchemaToBuilderState(parsed);
			schemaProperties = state.properties;
			schemaRequired = state.required;
			fieldOrder = state.fieldOrder;
			responseFormatType = 'json_schema';
			pasteJsonText = '';
			showPasteJson = false;
		} catch {
			pasteJsonError = 'Invalid JSON — check syntax and try again';
		}
	}

	const inputCls = $derived(
		`w-full px-3 py-2 text-sm rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 ${darkMode ? 'bg-slate-800/80 text-white border-slate-600/80 placeholder-slate-500' : 'bg-white text-slate-900 border-slate-200 placeholder-slate-400'}`
	);
	const labelCls = $derived(
		`block text-[11px] font-medium uppercase tracking-wider mb-1.5 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`
	);
</script>

<div class="space-y-5">
	<!-- Identity -->
	<div class="space-y-3">
		<div class="grid grid-cols-1 sm:grid-cols-[2fr_1fr] gap-3">
			<div>
				<label for="pe-name" class={labelCls}>Name <span class="text-red-400">*</span></label>
				<input id="pe-name" type="text" bind:value={promptName} placeholder="e.g. Property Location Details" class={inputCls} />
			</div>
			<div>
				<label for="pe-desc" class={labelCls}>Description</label>
				<input id="pe-desc" type="text" bind:value={promptDescription} placeholder="What this prompt does" class={inputCls} />
			</div>
		</div>
	</div>

	<!-- Google Search toggle -->
	<div class="flex items-center justify-between rounded-xl border px-4 py-3 {darkMode ? 'border-slate-700/50 bg-slate-800/30' : 'border-slate-200/80 bg-slate-50/50'}">
		<div class="flex items-center gap-2.5">
			<svg class="h-4 w-4 shrink-0 {googleSearchEnabled ? (darkMode ? 'text-emerald-400' : 'text-emerald-600') : (darkMode ? 'text-slate-600' : 'text-slate-400')}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
			</svg>
			<div>
				<span class="text-sm font-medium {darkMode ? 'text-slate-200' : 'text-slate-700'}">Google Search</span>
				<p class="text-[10px] {darkMode ? 'text-slate-500' : 'text-slate-400'}">Grounding with live web results. Disables structured JSON output.</p>
			</div>
		</div>
		<button
			type="button"
			role="switch"
			aria-checked={googleSearchEnabled}
			aria-label="Toggle Google Search"
			class="relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
				{googleSearchEnabled
					? 'bg-emerald-500'
					: darkMode ? 'bg-slate-600' : 'bg-slate-300'}"
			onclick={toggleGoogleSearch}
		>
			<span
				class="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out
					{googleSearchEnabled ? 'translate-x-4' : 'translate-x-0'}"
			></span>
		</button>
	</div>

	<!-- Prompt -->
	<div class="rounded-xl border {darkMode ? 'border-slate-700/50 bg-slate-800/30' : 'border-slate-200/80 bg-slate-50/50'} overflow-hidden">
		<div class="px-4 pt-3 pb-1">
			<label for="pe-prompt" class="text-[11px] font-semibold uppercase tracking-wider {darkMode ? 'text-slate-400' : 'text-slate-500'}">
				Prompt
			</label>
		</div>
		<div class="px-4 pb-4">
			<textarea
				id="pe-prompt"
				bind:value={userPrompt}
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

	<!-- System instruction (collapsible) -->
	<div>
		<button
			type="button"
			onclick={() => showSystemInstruction = !showSystemInstruction}
			class="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider transition-colors {darkMode ? 'text-slate-600 hover:text-slate-400' : 'text-slate-400 hover:text-slate-500'}"
		>
			<svg class="w-3 h-3 transition-transform {showSystemInstruction ? 'rotate-90' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
			System Instruction
		</button>
		{#if showSystemInstruction}
			<div class="mt-2">
				<textarea
					bind:value={systemInstruction}
					placeholder="System instruction for the AI model..."
					class="w-full px-3 py-2 text-sm rounded-lg border resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 {darkMode ? 'bg-slate-800/80 text-white border-slate-600/80 placeholder-slate-500' : 'bg-white text-slate-900 border-slate-200 placeholder-slate-400'}"
					rows="3"
				></textarea>
			</div>
		{/if}
	</div>

	<!-- Response Format -->
	{#if !hideResponseFormat}
	<div>
		<div class="flex items-center justify-between mb-3">
			<div class="flex items-center gap-2.5">
				<span class="text-[11px] font-semibold uppercase tracking-wider {darkMode ? 'text-slate-400' : 'text-slate-500'}">Response Format</span>
				<select
					bind:value={responseFormatType}
					disabled={googleSearchEnabled}
					class="text-xs rounded-lg border px-3 py-1 min-w-[9rem] {darkMode ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-white text-slate-500 border-slate-200'} focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
				>
					<option value="json_schema">Structured</option>
					<option value="text">Plain text</option>
					<option value="json_object">JSON object</option>
				</select>
				{#if googleSearchEnabled}
					<span class="text-[10px] {darkMode ? 'text-amber-400/80' : 'text-amber-600'}">Locked to plain text while Google Search is on</span>
				{/if}
			</div>
			{#if responseFormatType === 'json_schema'}
				<div class="flex gap-1.5">
					{#if onLoadSchemaFromLibrary}
						<button type="button" onclick={onLoadSchemaFromLibrary}
							class="px-2.5 py-1 text-[11px] font-medium rounded-lg transition-colors {darkMode ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200/60'}"
						>Pick from Library</button>
					{/if}
					<button type="button" onclick={() => handleAddField(true)}
						class="px-2.5 py-1 text-[11px] font-medium rounded-lg transition-colors {darkMode ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20' : 'bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-200/60'}"
					>+ Reasoning</button>
					<button type="button" onclick={() => handleAddField(false)}
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
				<div class="rounded-xl border {darkMode ? 'border-slate-600/60 bg-slate-800/40' : 'border-slate-200 bg-slate-50'} p-3 space-y-2 mb-3">
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
							<div class="flex items-center gap-2">
								{#key fieldName}
									<input
										type="text"
										value={fieldName}
										onblur={(e) => { const n = e.currentTarget.value.trim(); if (n && n !== fieldName) handleRenameField(fieldName, n); else if (!n) e.currentTarget.value = fieldName; }}
										onkeydown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
										class="flex-1 min-w-0 px-2 py-1 text-sm font-semibold rounded-md border bg-transparent {darkMode ? 'border-transparent text-white hover:border-slate-600 focus:border-indigo-500' : 'border-transparent text-slate-900 hover:border-slate-200 focus:border-indigo-500'} focus:outline-none transition-colors"
										placeholder="field_name"
									/>
								{/key}
								<select
									value={fieldSchema.type || 'string'}
									onchange={(e) => handleUpdateFieldType(fieldName, e.currentTarget.value)}
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
									onclick={() => handleToggleRequired(fieldName)}
									class="px-2 py-0.5 text-[10px] font-bold rounded-md uppercase tracking-wide transition-all
										{schemaRequired.includes(fieldName)
											? darkMode ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25' : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
											: darkMode ? 'bg-transparent text-slate-600 border border-slate-700' : 'bg-transparent text-slate-300 border border-slate-200'}"
								>Req</button>
								<button type="button" onclick={() => handleRemoveField(fieldName)}
									class="p-1 rounded-md transition-colors {darkMode ? 'text-slate-600 hover:text-red-400 hover:bg-red-500/10' : 'text-slate-300 hover:text-red-500 hover:bg-red-50'}"
									title="Remove field"
								>
									<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
								</button>
							</div>
							<div class="mt-2">
								<textarea
									value={fieldSchema.description || ''}
									oninput={(e) => handleUpdateField(fieldName, { description: e.currentTarget.value })}
									placeholder="Description required — what should the AI extract for this field?"
									class="w-full px-2 py-1.5 text-xs rounded-md border resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500/40
										{!fieldSchema.description
											? darkMode ? 'bg-red-500/5 border-red-500/30 text-slate-300 placeholder-red-400/60' : 'bg-red-50/50 border-red-200/80 text-slate-600 placeholder-red-300'
											: darkMode ? 'bg-slate-900/40 border-slate-700/40 text-slate-300 placeholder-slate-600' : 'bg-slate-50/80 border-slate-100 text-slate-600 placeholder-slate-400'}"
									rows="1"
								></textarea>
							</div>
							{#if fieldSchema.type === 'string'}
								{#if fieldSchema.enum}
									<input type="text" value={(fieldSchema.enum as string[]).join(', ')}
										oninput={(e) => { const v = e.currentTarget.value.trim(); if (v) handleUpdateField(fieldName, { enum: v.split(',').map((s: string) => s.trim()).filter(Boolean) }); else { const u = { ...fieldSchema }; delete u.enum; handleUpdateField(fieldName, u); }}}
										placeholder="Allowed values: low, medium, high"
										class="mt-2 w-full px-2 py-1.5 text-xs rounded-md border {darkMode ? 'bg-slate-900/40 border-slate-700/40 text-slate-300' : 'bg-slate-50/80 border-slate-100 text-slate-600'} focus:outline-none focus:ring-1 focus:ring-indigo-500/40"
									/>
								{/if}
								<button type="button"
									onclick={() => { if (fieldSchema.enum) { const u = { ...fieldSchema }; delete u.enum; handleUpdateField(fieldName, u); } else { handleUpdateField(fieldName, { enum: [] }); }}}
									class="mt-1.5 text-[10px] font-medium {darkMode ? 'text-slate-600 hover:text-slate-400' : 'text-slate-400 hover:text-slate-500'} transition-colors"
								>{fieldSchema.enum ? 'Remove allowed values' : '+ Restrict to allowed values'}</button>
							{/if}
							{#if fieldSchema.type === 'number' || fieldSchema.type === 'integer'}
								<div class="mt-2 grid grid-cols-2 gap-2">
									<input type="number" value={fieldSchema.minimum ?? ''} oninput={(e) => handleUpdateField(fieldName, e.currentTarget.value ? { minimum: Number(e.currentTarget.value) } : { minimum: undefined })} placeholder="Min" class="px-2 py-1.5 text-xs rounded-md border {darkMode ? 'bg-slate-900/40 border-slate-700/40 text-slate-300' : 'bg-slate-50/80 border-slate-100 text-slate-600'} focus:outline-none focus:ring-1 focus:ring-indigo-500/40" />
									<input type="number" value={fieldSchema.maximum ?? ''} oninput={(e) => handleUpdateField(fieldName, e.currentTarget.value ? { maximum: Number(e.currentTarget.value) } : { maximum: undefined })} placeholder="Max" class="px-2 py-1.5 text-xs rounded-md border {darkMode ? 'bg-slate-900/40 border-slate-700/40 text-slate-300' : 'bg-slate-50/80 border-slate-100 text-slate-600'} focus:outline-none focus:ring-1 focus:ring-indigo-500/40" />
								</div>
							{/if}
							{#if fieldSchema.type === 'object'}
								<div class="mt-3 border-l-2 {darkMode ? 'border-indigo-500/30' : 'border-indigo-200'} pl-3">
									<SchemaNodesEditor nodes={(fieldSchema.objectChildren as NestedSchemaPropertyNode[]) ?? []} {darkMode} {newNestedId} sectionTitle="Nested properties" addButtonLabel="+ Property" onNodesChange={(ch) => handleUpdateField(fieldName, { objectChildren: ch })} />
								</div>
							{/if}
							{#if fieldSchema.type === 'array'}
								{@const item = (fieldSchema.itemSchema as NestedItemSchema) ?? { type: 'string' }}
								<div class="mt-3 space-y-2 border-l-2 {darkMode ? 'border-indigo-500/30' : 'border-indigo-200'} pl-3">
									<div class="flex items-center gap-2">
										<span class="text-[10px] uppercase tracking-wider font-semibold {darkMode ? 'text-slate-600' : 'text-slate-400'}">Each item</span>
										<select value={item.type} onchange={(e) => { const v = e.currentTarget.value as NestedSchemaNodeType; const next: NestedItemSchema = v === 'object' ? { type: 'object', properties: [] } : v === 'array' ? { type: 'array', items: { type: 'string' } } : { type: v }; handleUpdateField(fieldName, { itemSchema: next }); }}
											class="text-[11px] rounded-md border px-3 py-1 min-w-[7rem] {darkMode ? 'bg-slate-700/60 text-slate-400 border-slate-600/60' : 'bg-slate-50 text-slate-500 border-slate-200'} focus:outline-none"
										>
											<option value="string">string</option><option value="number">number</option><option value="integer">integer</option><option value="boolean">boolean</option><option value="object">object</option><option value="array">array</option>
										</select>
									</div>
									{#if item.type === 'object'}
										<textarea value={item.description ?? ''} oninput={(e) => { const it = (fieldSchema.itemSchema ?? { type: 'object', properties: [] }) as NestedItemSchema; handleUpdateField(fieldName, { itemSchema: { ...it, type: 'object', description: e.currentTarget.value } }); }}
											placeholder="Description of each array element"
											class="w-full px-2 py-1.5 text-xs rounded-md border resize-none {darkMode ? 'bg-slate-900/40 border-slate-700/40 text-slate-300' : 'bg-slate-50/80 border-slate-100 text-slate-600'} focus:outline-none focus:ring-1 focus:ring-indigo-500/40" rows="1"
										></textarea>
										<SchemaNodesEditor nodes={item.properties ?? []} {darkMode} {newNestedId} sectionTitle="Item fields" addButtonLabel="+ Field"
											onNodesChange={(props) => { const it = (fieldSchema.itemSchema ?? { type: 'object', properties: [] }) as NestedItemSchema; handleUpdateField(fieldName, { itemSchema: { ...it, type: 'object', properties: props } }); }}
										/>
									{:else if item.type === 'array'}
										{@const inner = item.items ?? { type: 'string' }}
										<div class="flex items-center gap-2">
											<span class="text-[10px] uppercase tracking-wider font-semibold {darkMode ? 'text-slate-600' : 'text-slate-400'}">Inner</span>
											<select value={inner.type} onchange={(e) => { const v = e.currentTarget.value as NestedSchemaNodeType; const ni: NestedItemSchema = v === 'object' ? { type: 'object', properties: [] } : v === 'array' ? { type: 'array', items: { type: 'string' } } : { type: v }; handleUpdateField(fieldName, { itemSchema: { ...item, type: 'array', items: ni } }); }}
												class="text-[11px] rounded-md border px-1.5 py-0.5 {darkMode ? 'bg-slate-700/60 text-slate-400 border-slate-600/60' : 'bg-slate-50 text-slate-500 border-slate-200'} focus:outline-none"
											>
												<option value="string">string</option><option value="number">number</option><option value="integer">integer</option><option value="boolean">boolean</option><option value="object">object</option><option value="array">array</option>
											</select>
										</div>
										{#if inner.type === 'object'}
											<textarea value={inner.description ?? ''} oninput={(e) => { const it = (fieldSchema.itemSchema ?? { type: 'array', items: inner }) as NestedItemSchema; const inn = (it.items ?? inner) as NestedItemSchema; handleUpdateField(fieldName, { itemSchema: { ...it, type: 'array', items: { ...inn, type: 'object', description: e.currentTarget.value } } }); }}
												class="w-full px-2 py-1.5 text-xs rounded-md border resize-none {darkMode ? 'bg-slate-900/40 border-slate-700/40 text-slate-300' : 'bg-slate-50/80 border-slate-100 text-slate-600'} focus:outline-none focus:ring-1 focus:ring-indigo-500/40" rows="1"
											></textarea>
											<SchemaNodesEditor nodes={inner.properties ?? []} {darkMode} {newNestedId} sectionTitle="Inner fields" addButtonLabel="+ Field"
												onNodesChange={(props) => { const it = (fieldSchema.itemSchema ?? { type: 'array', items: inner }) as NestedItemSchema; const inn = (it.items ?? inner) as NestedItemSchema; handleUpdateField(fieldName, { itemSchema: { ...it, type: 'array', items: { ...inn, type: 'object', properties: props } } }); }}
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
	{/if}

	<!-- Advanced -->
	<details class="group">
		<summary class="flex items-center gap-2 cursor-pointer select-none py-1 {darkMode ? 'text-slate-600 hover:text-slate-400' : 'text-slate-400 hover:text-slate-500'} transition-colors">
			<svg class="w-3 h-3 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
			<span class="text-[11px] font-medium uppercase tracking-wider">Advanced</span>
		</summary>
		<div class="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
			<div>
				<label for="pe-temp" class={labelCls}>Creativity</label>
				<input type="number" id="pe-temp" bind:value={temperature} min="0" max="2" step="0.1" placeholder="1.0" class={inputCls} />
			</div>
			<div>
				<label for="pe-tokens" class={labelCls}>Max tokens</label>
				<input type="number" id="pe-tokens" bind:value={maxTokens} min="1" placeholder="Auto" class={inputCls} />
			</div>
			<div>
				<label for="pe-top-p" class={labelCls}>Diversity</label>
				<input type="number" id="pe-top-p" bind:value={topP} min="0" max="1" step="0.1" placeholder="1.0" class={inputCls} />
			</div>
			<div>
				<label for="pe-freq" class={labelCls}>Freq penalty</label>
				<input type="number" id="pe-freq" bind:value={frequencyPenalty} min="-2" max="2" step="0.1" placeholder="0" class={inputCls} />
			</div>
		</div>
		<div class="mt-3">
			<label for="pe-stop" class={labelCls}>Stop sequences</label>
			<input type="text" id="pe-stop" bind:value={stopSequences} placeholder="e.g. END, [DONE]" class={inputCls} />
		</div>
	</details>

	<!-- Actions -->
	<div class="flex items-center gap-3 pt-2">
		{#if onGenerate}
			<button
				type="button"
				onclick={onGenerate}
				disabled={isGenerating || !userPrompt.trim()}
				class="px-4 py-2 text-xs font-semibold rounded-lg transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed
					{darkMode ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}"
			>
				{#if isGenerating}
					<span class="inline-flex items-center gap-1.5">
						<svg class="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" /><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
						Generating...
					</span>
				{:else}
					Generate
				{/if}
			</button>
		{/if}
		{#if onSave}
			<button
				type="button"
				onclick={onSave}
				disabled={isSaving || !promptName.trim()}
				class="px-4 py-2 text-xs font-semibold rounded-lg transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed
					{darkMode ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}"
			>
				{isSaving ? 'Saving...' : 'Save Prompt'}
			</button>
		{/if}
		{#if generateError}
			<span class="text-xs {darkMode ? 'text-red-400' : 'text-red-500'}">{generateError}</span>
		{/if}
	</div>
</div>
