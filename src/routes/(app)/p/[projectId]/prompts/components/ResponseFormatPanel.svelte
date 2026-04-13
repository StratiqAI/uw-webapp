<script lang="ts">
	import {
		newNestedId,
		getOrderedFieldEntries,
		addSchemaField as addField,
		removeSchemaField as removeField,
		updateSchemaField as patchField,
		updateSchemaFieldType as changeFieldType,
		toggleSchemaFieldRequired as toggleReq,
		renameSchemaField,
		buildSchemaPreview,
		parseJsonSchemaToBuilderState,
		SchemaNodesEditor,
		type SchemaBuilderState,
		type NestedItemSchema,
		type NestedSchemaNodeType,
		type NestedSchemaPropertyNode
	} from '@stratiqai/dashboard-widget-sdk';

	let {
		darkMode = false,
		responseFormatType = $bindable<'text' | 'json_object' | 'json_schema'>('json_schema'),
		schemaProperties = $bindable<Record<string, Record<string, unknown>>>({}),
		schemaRequired = $bindable<string[]>([]),
		fieldOrder = $bindable<string[]>([]),
		googleSearchActive = false,
		onLoadSchemaFromLibrary,
		/** When set, shows a switch for whether the next Run sends a JSON response schema (`tools.applyStructuredResponse`). */
		controlledGenerationEnabled = false,
		onToggleControlledGeneration
	} = $props<{
		darkMode?: boolean;
		responseFormatType?: 'text' | 'json_object' | 'json_schema';
		schemaProperties?: Record<string, Record<string, unknown>>;
		schemaRequired?: string[];
		fieldOrder?: string[];
		googleSearchActive?: boolean;
		onLoadSchemaFromLibrary?: () => void;
		controlledGenerationEnabled?: boolean;
		onToggleControlledGeneration?: () => void;
	}>();

	let showPasteJson = $state(false);
	let pasteJsonText = $state('');
	let pasteJsonError = $state('');

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
</script>

<div class="flex h-full min-h-0 flex-col overflow-hidden">
	<!-- Header row: format selector + action buttons -->
	<div class="shrink-0 space-y-2 pb-2">
	
		{#if onToggleControlledGeneration}
			<div class="flex items-center justify-between pb-1">
				<label class="flex items-center gap-2 cursor-pointer">
					<div class="relative inline-block w-8 h-4 transition duration-200 ease-in-out">
						<input type="checkbox" checked={controlledGenerationEnabled && !googleSearchActive} disabled={googleSearchActive} onchange={onToggleControlledGeneration} class="peer absolute w-0 h-0 opacity-0" />
						<div class="absolute inset-0 rounded-full transition-colors {darkMode ? 'bg-slate-700 peer-checked:bg-indigo-500' : 'bg-slate-300 peer-checked:bg-indigo-500'} {googleSearchActive ? 'opacity-50 cursor-not-allowed' : ''}"></div>
						<div class="absolute left-0.5 top-0.5 w-3 h-3 rounded-full bg-white transition-transform peer-checked:translate-x-4 shadow-sm"></div>
					</div>
					<span class="text-[11px] font-medium {darkMode ? 'text-slate-300' : 'text-slate-700'} {googleSearchActive ? 'opacity-50' : ''}">Apply structured response</span>
				</label>
			</div>
		{/if}

		{#if googleSearchActive}
			<p class="text-[9px] {darkMode ? 'text-amber-400/80' : 'text-amber-600'}">Locked to plain text while Grounding with Google Search/Maps is on</p>
		{/if}
		{#if responseFormatType === 'json_schema'}
			<div class="flex flex-wrap gap-1">
				{#if onLoadSchemaFromLibrary}
					<button type="button" onclick={onLoadSchemaFromLibrary}
						class="px-2 py-0.5 text-[10px] font-medium rounded-md transition-colors {darkMode ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200/60'}"
					>Pick from Library</button>
				{/if}
				<button type="button" onclick={() => handleAddField(true)}
					class="px-2 py-0.5 text-[10px] font-medium rounded-md transition-colors {darkMode ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20' : 'bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-200/60'}"
				>+ Reasoning</button>
				<button type="button" onclick={() => handleAddField(false)}
					class="px-2 py-0.5 text-[10px] font-medium rounded-md transition-colors {darkMode ? 'bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/20' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-200/60'}"
				>+ Field</button>
				<button type="button" onclick={() => { showPasteJson = !showPasteJson; pasteJsonError = ''; }}
					class="px-2 py-0.5 text-[10px] font-medium rounded-md transition-colors {darkMode ? 'bg-slate-500/10 text-slate-400 hover:bg-slate-500/20 border border-slate-500/20' : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-200/60'}"
				>{showPasteJson ? 'Cancel' : 'Paste JSON'}</button>
			</div>
		{/if}
	</div>

	<!-- Scrollable field list -->
	{#if responseFormatType === 'json_schema'}
		<div class="min-h-0 flex-1 overflow-y-auto">
			{#if showPasteJson}
				<div class="rounded-lg border {darkMode ? 'border-slate-600/60 bg-slate-800/40' : 'border-slate-200 bg-slate-50'} p-2 space-y-1.5 mb-2">
					<textarea
						bind:value={pasteJsonText}
						placeholder={'{\n  "type": "object",\n  "properties": { ... }\n}'}
						class="w-full px-2 py-1.5 text-[10px] font-mono rounded-md border resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 {darkMode ? 'bg-slate-900/60 text-slate-300 border-slate-700/60 placeholder-slate-600' : 'bg-white text-slate-800 border-slate-200 placeholder-slate-400'}"
						rows="5"
					></textarea>
					<div class="flex items-center gap-1.5">
						<button
							type="button"
							onclick={handlePasteJsonApply}
							disabled={!pasteJsonText.trim()}
							class="px-2 py-0.5 text-[10px] font-semibold rounded-md transition-all disabled:opacity-40 disabled:cursor-not-allowed
								{darkMode ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}"
						>Apply</button>
						{#if pasteJsonError}
							<span class="text-[10px] {darkMode ? 'text-red-400' : 'text-red-500'}">{pasteJsonError}</span>
						{/if}
					</div>
				</div>
			{/if}

			<div class="space-y-1.5">
				{#each orderedFieldEntries as [fieldName, fieldSchema] (fieldName)}
					<div class="rounded-lg border {darkMode ? 'border-slate-700/50 bg-slate-800/30' : 'border-slate-200/80 bg-white'} overflow-hidden">
						<div class="px-2.5 py-2">
							<div class="flex items-center gap-1.5">
								{#key fieldName}
									<input
										type="text"
										value={fieldName}
										onblur={(e) => { const n = e.currentTarget.value.trim(); if (n && n !== fieldName) handleRenameField(fieldName, n); else if (!n) e.currentTarget.value = fieldName; }}
										onkeydown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
										class="min-w-0 flex-1 px-1.5 py-0.5 text-xs font-semibold rounded-md border bg-transparent {darkMode ? 'border-transparent text-white hover:border-slate-600 focus:border-indigo-500' : 'border-transparent text-slate-900 hover:border-slate-200 focus:border-indigo-500'} focus:outline-none transition-colors"
										placeholder="field_name"
									/>
								{/key}
								<select
									value={fieldSchema.type || 'string'}
									onchange={(e) => handleUpdateFieldType(fieldName, e.currentTarget.value)}
									class="text-[10px] rounded-md border px-1 py-0.5 {darkMode ? 'bg-slate-700/60 text-slate-400 border-slate-600/60' : 'bg-slate-50 text-slate-500 border-slate-200'} focus:outline-none"
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
									class="px-1.5 py-0.5 text-[9px] font-bold rounded-md uppercase tracking-wide transition-all
										{schemaRequired.includes(fieldName)
											? darkMode ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25' : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
											: darkMode ? 'bg-transparent text-slate-600 border border-slate-700' : 'bg-transparent text-slate-300 border border-slate-200'}"
								>Req</button>
								<button type="button" onclick={() => handleRemoveField(fieldName)}
									class="p-0.5 rounded-md transition-colors {darkMode ? 'text-slate-600 hover:text-red-400 hover:bg-red-500/10' : 'text-slate-300 hover:text-red-500 hover:bg-red-50'}"
									title="Remove field"
								>
									<svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
								</button>
							</div>
							<div class="mt-1.5">
								<textarea
									value={(fieldSchema.description as string) || ''}
									oninput={(e) => handleUpdateField(fieldName, { description: e.currentTarget.value })}
									placeholder="Description — what should the AI extract?"
									class="w-full px-1.5 py-1 text-[10px] rounded-md border resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500/40
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
										class="mt-1.5 w-full px-1.5 py-1 text-[10px] rounded-md border {darkMode ? 'bg-slate-900/40 border-slate-700/40 text-slate-300' : 'bg-slate-50/80 border-slate-100 text-slate-600'} focus:outline-none focus:ring-1 focus:ring-indigo-500/40"
									/>
								{/if}
								<button type="button"
									onclick={() => { if (fieldSchema.enum) { const u = { ...fieldSchema }; delete u.enum; handleUpdateField(fieldName, u); } else { handleUpdateField(fieldName, { enum: [] }); }}}
									class="mt-1 text-[9px] font-medium {darkMode ? 'text-slate-600 hover:text-slate-400' : 'text-slate-400 hover:text-slate-500'} transition-colors"
								>{fieldSchema.enum ? 'Remove allowed values' : '+ Restrict to allowed values'}</button>
							{/if}
							{#if fieldSchema.type === 'number' || fieldSchema.type === 'integer'}
								<div class="mt-1.5 grid grid-cols-2 gap-1.5">
									<input type="number" value={fieldSchema.minimum ?? ''} oninput={(e) => handleUpdateField(fieldName, e.currentTarget.value ? { minimum: Number(e.currentTarget.value) } : { minimum: undefined })} placeholder="Min" class="px-1.5 py-1 text-[10px] rounded-md border {darkMode ? 'bg-slate-900/40 border-slate-700/40 text-slate-300' : 'bg-slate-50/80 border-slate-100 text-slate-600'} focus:outline-none focus:ring-1 focus:ring-indigo-500/40" />
									<input type="number" value={fieldSchema.maximum ?? ''} oninput={(e) => handleUpdateField(fieldName, e.currentTarget.value ? { maximum: Number(e.currentTarget.value) } : { maximum: undefined })} placeholder="Max" class="px-1.5 py-1 text-[10px] rounded-md border {darkMode ? 'bg-slate-900/40 border-slate-700/40 text-slate-300' : 'bg-slate-50/80 border-slate-100 text-slate-600'} focus:outline-none focus:ring-1 focus:ring-indigo-500/40" />
								</div>
							{/if}
							{#if fieldSchema.type === 'object'}
								<div class="mt-2 border-l-2 {darkMode ? 'border-indigo-500/30' : 'border-indigo-200'} pl-2">
									<SchemaNodesEditor nodes={(fieldSchema.objectChildren as NestedSchemaPropertyNode[]) ?? []} {darkMode} {newNestedId} sectionTitle="Nested properties" addButtonLabel="+ Property" onNodesChange={(ch) => handleUpdateField(fieldName, { objectChildren: ch })} />
								</div>
							{/if}
							{#if fieldSchema.type === 'array'}
								{@const item = (fieldSchema.itemSchema as NestedItemSchema) ?? { type: 'string' }}
								<div class="mt-2 space-y-1.5 border-l-2 {darkMode ? 'border-indigo-500/30' : 'border-indigo-200'} pl-2">
									<div class="flex items-center gap-1.5">
										<span class="text-[9px] uppercase tracking-wider font-semibold {darkMode ? 'text-slate-600' : 'text-slate-400'}">Each item</span>
										<select value={item.type} onchange={(e) => { const v = e.currentTarget.value as NestedSchemaNodeType; const next: NestedItemSchema = v === 'object' ? { type: 'object', properties: [] } : v === 'array' ? { type: 'array', items: { type: 'string' } } : { type: v }; handleUpdateField(fieldName, { itemSchema: next }); }}
											class="text-[10px] rounded-md border px-2 py-0.5 {darkMode ? 'bg-slate-700/60 text-slate-400 border-slate-600/60' : 'bg-slate-50 text-slate-500 border-slate-200'} focus:outline-none"
										>
											<option value="string">string</option><option value="number">number</option><option value="integer">integer</option><option value="boolean">boolean</option><option value="object">object</option><option value="array">array</option>
										</select>
									</div>
									{#if item.type === 'object'}
										<textarea value={item.description ?? ''} oninput={(e) => { const it = (fieldSchema.itemSchema ?? { type: 'object', properties: [] }) as NestedItemSchema; handleUpdateField(fieldName, { itemSchema: { ...it, type: 'object', description: e.currentTarget.value } }); }}
											placeholder="Description of each array element"
											class="w-full px-1.5 py-1 text-[10px] rounded-md border resize-none {darkMode ? 'bg-slate-900/40 border-slate-700/40 text-slate-300' : 'bg-slate-50/80 border-slate-100 text-slate-600'} focus:outline-none focus:ring-1 focus:ring-indigo-500/40" rows="1"
										></textarea>
										<SchemaNodesEditor nodes={item.properties ?? []} {darkMode} {newNestedId} sectionTitle="Item fields" addButtonLabel="+ Field"
											onNodesChange={(props) => { const it = (fieldSchema.itemSchema ?? { type: 'object', properties: [] }) as NestedItemSchema; handleUpdateField(fieldName, { itemSchema: { ...it, type: 'object', properties: props } }); }}
										/>
									{:else if item.type === 'array'}
										{@const inner = item.items ?? { type: 'string' }}
										<div class="flex items-center gap-1.5">
											<span class="text-[9px] uppercase tracking-wider font-semibold {darkMode ? 'text-slate-600' : 'text-slate-400'}">Inner</span>
											<select value={inner.type} onchange={(e) => { const v = e.currentTarget.value as NestedSchemaNodeType; const ni: NestedItemSchema = v === 'object' ? { type: 'object', properties: [] } : v === 'array' ? { type: 'array', items: { type: 'string' } } : { type: v }; handleUpdateField(fieldName, { itemSchema: { ...item, type: 'array', items: ni } }); }}
												class="text-[10px] rounded-md border px-1.5 py-0.5 {darkMode ? 'bg-slate-700/60 text-slate-400 border-slate-600/60' : 'bg-slate-50 text-slate-500 border-slate-200'} focus:outline-none"
											>
												<option value="string">string</option><option value="number">number</option><option value="integer">integer</option><option value="boolean">boolean</option><option value="object">object</option><option value="array">array</option>
											</select>
										</div>
										{#if inner.type === 'object'}
											<textarea value={inner.description ?? ''} oninput={(e) => { const it = (fieldSchema.itemSchema ?? { type: 'array', items: inner }) as NestedItemSchema; const inn = (it.items ?? inner) as NestedItemSchema; handleUpdateField(fieldName, { itemSchema: { ...it, type: 'array', items: { ...inn, type: 'object', description: e.currentTarget.value } } }); }}
												class="w-full px-1.5 py-1 text-[10px] rounded-md border resize-none {darkMode ? 'bg-slate-900/40 border-slate-700/40 text-slate-300' : 'bg-slate-50/80 border-slate-100 text-slate-600'} focus:outline-none focus:ring-1 focus:ring-indigo-500/40" rows="1"
											></textarea>
											<SchemaNodesEditor nodes={inner.properties ?? []} {darkMode} {newNestedId} sectionTitle="Inner fields" addButtonLabel="+ Field"
												onNodesChange={(props) => { const it = (fieldSchema.itemSchema ?? { type: 'array', items: inner }) as NestedItemSchema; const inn = (it.items ?? inner) as NestedItemSchema; handleUpdateField(fieldName, { itemSchema: { ...it, type: 'array', items: { ...inn, type: 'object', properties: props } } }); }}
											/>
										{:else if inner.type === 'array'}
											<p class="text-[9px] {darkMode ? 'text-slate-600' : 'text-slate-400'}">Max nesting reached.</p>
										{/if}
									{/if}
								</div>
							{/if}
						</div>
					</div>
				{/each}

				{#if Object.keys(schemaProperties).length === 0}
					<div class="rounded-lg border-2 border-dashed {darkMode ? 'border-slate-700/60' : 'border-slate-200'} py-6 text-center">
						<p class="text-xs {darkMode ? 'text-slate-500' : 'text-slate-400'}">No fields defined yet</p>
						<p class="mt-0.5 text-[10px] {darkMode ? 'text-slate-600' : 'text-slate-300'}">Click <strong>+ Field</strong> above to define what the AI returns</p>
					</div>
				{/if}
			</div>

			{#if Object.keys(schemaProperties).length > 0}
				<details class="mt-2">
					<summary class="text-[10px] font-medium cursor-pointer select-none {darkMode ? 'text-slate-600 hover:text-slate-400' : 'text-slate-400 hover:text-slate-500'} transition-colors">
						JSON schema preview
					</summary>
					<pre class="mt-1.5 p-2 rounded-md text-[9px] leading-relaxed overflow-auto max-h-36 {darkMode ? 'bg-slate-800/60 text-slate-400 border border-slate-700/40' : 'bg-slate-50 text-slate-500 border border-slate-100'}">{JSON.stringify(schemaPreview, null, 2)}</pre>
				</details>
			{/if}
		</div>
	{/if}
</div>
