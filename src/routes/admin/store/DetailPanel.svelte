<script lang="ts">
	import { validatedTopicStore } from '$lib/stores/validatedTopicStore';
	import { schemaToFields, formatJson, getValueType, type FieldDescriptor } from './utils';

	interface Props {
		topic: string;
		darkMode: boolean;
	}

	let { topic, darkMode }: Props = $props();

	type Tab = 'data' | 'schema' | 'form' | 'compare';
	let activeTab = $state<Tab>('data');

	let topicData = $derived.by(() => {
		void validatedTopicStore.tree;
		return validatedTopicStore.at(topic);
	});

	let matchedSchema = $derived.by(() => {
		void validatedTopicStore.schemaVersion;
		const reg = validatedTopicStore.getSchemaForTopic(topic);
		if (reg) {
			return { pattern: reg.topicPattern ?? reg.id, schema: reg.jsonSchema as Record<string, unknown> };
		}
		return null;
	});

	let schemaFields = $derived(matchedSchema ? schemaToFields(matchedSchema.schema) : []);

	let topicErrors = $derived(validatedTopicStore.errors.get(topic));

	// Data tab editing
	let editing = $state(false);
	let editValue = $state('');
	let editError = $state<string | null>(null);
	let editSuccess = $state(false);

	function startEdit() {
		editValue = formatJson(topicData);
		editError = null;
		editSuccess = false;
		editing = true;
	}

	function cancelEdit() {
		editing = false;
		editError = null;
	}

	function saveEdit() {
		try {
			const parsed = JSON.parse(editValue);
			const ok = validatedTopicStore.publish(topic, parsed);
			if (ok) {
				editing = false;
				editSuccess = true;
				editError = null;
				setTimeout(() => editSuccess = false, 2000);
			} else {
				const errs = validatedTopicStore.errors.get(topic);
				editError = errs ? JSON.stringify(errs, null, 2) : 'Validation failed';
			}
		} catch (e) {
			editError = `Invalid JSON: ${(e as Error).message}`;
		}
	}

	// Form tab state
	let formValues = $state<Record<string, unknown>>({});
	let formError = $state<string | null>(null);
	let formSuccess = $state(false);

	function initForm() {
		formValues = topicData && typeof topicData === 'object' ? JSON.parse(JSON.stringify(topicData)) : {};
		formError = null;
		formSuccess = false;
	}

	function saveForm() {
		const ok = validatedTopicStore.publish(topic, formValues);
		if (ok) {
			formSuccess = true;
			formError = null;
			setTimeout(() => formSuccess = false, 2000);
		} else {
			const errs = validatedTopicStore.errors.get(topic);
			formError = errs ? JSON.stringify(errs, null, 2) : 'Validation failed';
		}
	}

	$effect(() => {
		if (topic) {
			editing = false;
			editError = null;
			activeTab = 'data';
		}
	});

	$effect(() => {
		if (activeTab === 'form') initForm();
	});

	function getFormValue(path: string): unknown {
		const parts = path.split('.');
		let current: unknown = formValues;
		for (const part of parts) {
			if (current === null || current === undefined || typeof current !== 'object') return undefined;
			current = (current as Record<string, unknown>)[part];
		}
		return current;
	}

	function setFormValue(path: string, value: unknown) {
		const parts = path.split('.');
		const newVals = JSON.parse(JSON.stringify(formValues));
		let current = newVals;
		for (let i = 0; i < parts.length - 1; i++) {
			if (!(parts[i] in current) || typeof current[parts[i]] !== 'object') {
				current[parts[i]] = {};
			}
			current = current[parts[i]];
		}
		current[parts[parts.length - 1]] = value;
		formValues = newVals;
	}

	// Comparison helpers
	function getNestedValue(obj: unknown, path: string): unknown {
		if (!obj || typeof obj !== 'object') return undefined;
		const parts = path.split('.');
		let current: unknown = obj;
		for (const part of parts) {
			if (current === null || current === undefined || typeof current !== 'object') return undefined;
			current = (current as Record<string, unknown>)[part];
		}
		return current;
	}

	type CompareStatus = 'match' | 'missing' | 'type-mismatch' | 'extra';

	function getCompareStatus(field: FieldDescriptor, data: unknown): CompareStatus {
		const val = getNestedValue(data, field.path);
		if (val === undefined) return field.required ? 'missing' : 'match';
		const actualType = getValueType(val);
		if (field.type === 'enum') return field.enumValues?.includes(val as string | number) ? 'match' : 'type-mismatch';
		if (field.type === 'number' || field.type === 'integer') return actualType === 'number' ? 'match' : 'type-mismatch';
		if (field.type === actualType) return 'match';
		if (field.nullable && val === null) return 'match';
		return 'type-mismatch';
	}

	const tabDef: { id: Tab; label: string }[] = [
		{ id: 'data', label: 'Data' },
		{ id: 'schema', label: 'Schema' },
		{ id: 'form', label: 'Form' },
		{ id: 'compare', label: 'Compare' }
	];
</script>

<div class="flex h-full flex-col overflow-hidden">
	<!-- Topic path breadcrumb -->
	<div class="flex items-center gap-2 border-b px-4 py-2 {darkMode ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-slate-50'}">
		<span class="font-mono text-xs {darkMode ? 'text-slate-400' : 'text-slate-500'}">Topic:</span>
		<span class="font-mono text-sm font-medium {darkMode ? 'text-indigo-400' : 'text-indigo-600'}">{topic}</span>
		{#if topicErrors}
			<span class="ml-auto rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
				Validation Error
			</span>
		{/if}
		{#if editSuccess || formSuccess}
			<span class="ml-auto rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
				Saved
			</span>
		{/if}
	</div>

	<!-- Tabs -->
	<div class="flex border-b {darkMode ? 'border-slate-700' : 'border-slate-200'}">
		{#each tabDef as tab}
			<button
				type="button"
				class="px-4 py-2 text-sm font-medium transition-colors
					{activeTab === tab.id
						? (darkMode ? 'border-b-2 border-indigo-400 text-indigo-400' : 'border-b-2 border-indigo-600 text-indigo-600')
						: (darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700')}"
				onclick={() => activeTab = tab.id}
			>
				{tab.label}
			</button>
		{/each}
	</div>

	<!-- Tab content -->
	<div class="flex-1 overflow-y-auto">
		{#if activeTab === 'data'}
			<!-- DATA TAB -->
			<div class="p-4">
				{#if editing}
					<div class="space-y-3">
						<textarea
							class="w-full rounded border font-mono text-sm p-3 min-h-[300px] resize-y
								{darkMode ? 'border-slate-600 bg-slate-800 text-slate-200' : 'border-slate-300 bg-white text-slate-900'}
								focus:outline-none focus:ring-2 focus:ring-indigo-500"
							bind:value={editValue}
						></textarea>
						{#if editError}
							<pre class="rounded border border-red-300 bg-red-50 p-3 text-xs text-red-700 dark:border-red-700 dark:bg-red-900/20 dark:text-red-400 overflow-x-auto">{editError}</pre>
						{/if}
						<div class="flex gap-2">
							<button
								type="button"
								class="rounded bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
								onclick={saveEdit}
							>Save</button>
							<button
								type="button"
								class="rounded px-3 py-1.5 text-sm font-medium transition-colors
									{darkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}"
								onclick={cancelEdit}
							>Cancel</button>
						</div>
					</div>
				{:else}
					<div class="relative group">
						<button
							type="button"
							class="absolute right-2 top-2 rounded px-2 py-1 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity
								{darkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}"
							onclick={startEdit}
						>Edit</button>
						<pre class="rounded border p-4 text-sm overflow-x-auto
							{darkMode ? 'border-slate-700 bg-slate-800/50 text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-800'}">{formatJson(topicData)}</pre>
					</div>
					{#if topicErrors}
						<div class="mt-4">
							<h4 class="mb-2 text-sm font-medium {darkMode ? 'text-red-400' : 'text-red-600'}">Validation Errors</h4>
							<pre class="rounded border border-red-300 bg-red-50 p-3 text-xs text-red-700 dark:border-red-700 dark:bg-red-900/20 dark:text-red-400 overflow-x-auto">{formatJson(topicErrors)}</pre>
						</div>
					{/if}
				{/if}
			</div>

		{:else if activeTab === 'schema'}
			<!-- SCHEMA TAB -->
			<div class="p-4 space-y-4">
				{#if matchedSchema}
					<div class="flex items-center gap-2 text-sm">
						<span class="{darkMode ? 'text-slate-400' : 'text-slate-500'}">Matched pattern:</span>
						<code class="rounded px-2 py-0.5 font-mono text-xs {darkMode ? 'bg-slate-700 text-amber-400' : 'bg-amber-50 text-amber-700'}">{matchedSchema.pattern}</code>
					</div>

					{#if schemaFields.length > 0}
						<div class="space-y-1">
							<h4 class="text-sm font-medium {darkMode ? 'text-slate-200' : 'text-slate-700'}">Properties</h4>
							{#snippet schemaFieldNode(field: FieldDescriptor, depth: number)}
								<div class="flex items-start gap-2 py-1" style="padding-left: {depth * 20}px">
									<span class="font-mono text-xs font-medium {darkMode ? 'text-slate-200' : 'text-slate-800'}">{field.name}</span>
									<span class="rounded px-1.5 py-0.5 text-xs font-mono
										{field.type === 'string' ? (darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700') :
										 field.type === 'number' || field.type === 'integer' ? (darkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-700') :
										 field.type === 'boolean' ? (darkMode ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-100 text-yellow-700') :
										 field.type === 'enum' ? (darkMode ? 'bg-purple-900/30 text-purple-400' : 'bg-purple-100 text-purple-700') :
										 field.type === 'array' ? (darkMode ? 'bg-cyan-900/30 text-cyan-400' : 'bg-cyan-100 text-cyan-700') :
										 field.type === 'object' ? (darkMode ? 'bg-amber-900/30 text-amber-400' : 'bg-amber-100 text-amber-700') :
										 (darkMode ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500')}">{field.type}{field.nullable ? '?' : ''}</span>
									{#if field.required}
										<span class="rounded px-1 py-0.5 text-xs font-medium {darkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-600'}">required</span>
									{/if}
									{#if field.enumValues}
										<span class="text-xs {darkMode ? 'text-slate-400' : 'text-slate-500'}">[{field.enumValues.join(', ')}]</span>
									{/if}
									{#if field.minimum !== undefined || field.maximum !== undefined}
										<span class="text-xs {darkMode ? 'text-slate-400' : 'text-slate-500'}">{field.minimum ?? ''}..{field.maximum ?? ''}</span>
									{/if}
									{#if field.description}
										<span class="text-xs italic {darkMode ? 'text-slate-500' : 'text-slate-400'}">{field.description}</span>
									{/if}
								</div>
								{#if field.children}
									{#each field.children as child}
										{@render schemaFieldNode(child, depth + 1)}
									{/each}
								{/if}
							{/snippet}
							{#each schemaFields as field}
								{@render schemaFieldNode(field, 0)}
							{/each}
						</div>
					{/if}

					<details class="{darkMode ? 'text-slate-400' : 'text-slate-600'}">
						<summary class="cursor-pointer text-sm font-medium">Raw JSON Schema</summary>
						<pre class="mt-2 rounded border p-3 text-xs overflow-x-auto {darkMode ? 'border-slate-700 bg-slate-800/50 text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-700'}">{formatJson(matchedSchema.schema)}</pre>
					</details>
				{:else}
					<div class="py-8 text-center">
						<p class="text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'}">No schema matches this topic</p>
						<p class="mt-2 text-xs {darkMode ? 'text-slate-500' : 'text-slate-400'}">
							{validatedTopicStore.getAISchemaPrompt(topic)}
						</p>
					</div>
				{/if}
			</div>

		{:else if activeTab === 'form'}
			<!-- FORM TAB -->
			<div class="p-4">
				{#if matchedSchema && schemaFields.length > 0}
					<div class="space-y-4">
						{#snippet formField(field: FieldDescriptor)}
							<div class="space-y-1">
								<label class="flex items-center gap-2">
									<span class="text-sm font-medium {darkMode ? 'text-slate-200' : 'text-slate-700'}">{field.name}</span>
									{#if field.required}
										<span class="text-red-500 text-xs">*</span>
									{/if}
									{#if field.nullable}
										<label class="flex items-center gap-1 text-xs {darkMode ? 'text-slate-400' : 'text-slate-500'}">
											<input
												type="checkbox"
												checked={getFormValue(field.path) === null}
												onchange={(e) => setFormValue(field.path, (e.target as HTMLInputElement).checked ? null : (field.default ?? ''))}
												class="rounded border-slate-300"
											/>
											null
										</label>
									{/if}
								</label>
								{#if field.description}
									<p class="text-xs {darkMode ? 'text-slate-500' : 'text-slate-400'}">{field.description}</p>
								{/if}

								{#if getFormValue(field.path) === null && field.nullable}
									<span class="text-xs italic {darkMode ? 'text-slate-500' : 'text-slate-400'}">Value is null</span>
								{:else if field.type === 'enum'}
									<select
										class="w-full rounded border px-3 py-1.5 text-sm {darkMode ? 'border-slate-600 bg-slate-800 text-slate-200' : 'border-slate-300 bg-white text-slate-900'}"
										value={String(getFormValue(field.path) ?? '')}
										onchange={(e) => setFormValue(field.path, (e.target as HTMLSelectElement).value)}
									>
										<option value="">—</option>
										{#each field.enumValues ?? [] as opt}
											<option value={String(opt)}>{opt}</option>
										{/each}
									</select>
								{:else if field.type === 'boolean'}
									<button
										type="button"
										class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors
											{getFormValue(field.path) ? 'bg-indigo-600' : (darkMode ? 'bg-slate-600' : 'bg-slate-300')}"
										onclick={() => setFormValue(field.path, !getFormValue(field.path))}
										role="switch"
										aria-checked={!!getFormValue(field.path)}
										aria-label="Toggle {field.name}"
									>
										<span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {getFormValue(field.path) ? 'translate-x-6' : 'translate-x-1'}"></span>
									</button>
								{:else if field.type === 'number' || field.type === 'integer'}
									<input
										type="number"
										class="w-full rounded border px-3 py-1.5 text-sm {darkMode ? 'border-slate-600 bg-slate-800 text-slate-200' : 'border-slate-300 bg-white text-slate-900'} focus:outline-none focus:ring-2 focus:ring-indigo-500"
										value={getFormValue(field.path) ?? ''}
										min={field.minimum}
										max={field.maximum}
										step={field.type === 'integer' ? 1 : 'any'}
										oninput={(e) => {
											const v = (e.target as HTMLInputElement).value;
											setFormValue(field.path, v === '' ? undefined : Number(v));
										}}
									/>
								{:else if field.type === 'string'}
									{#if (field.maxLength ?? 0) > 200}
										<textarea
											class="w-full rounded border px-3 py-1.5 text-sm min-h-[80px] resize-y {darkMode ? 'border-slate-600 bg-slate-800 text-slate-200' : 'border-slate-300 bg-white text-slate-900'} focus:outline-none focus:ring-2 focus:ring-indigo-500"
											value={String(getFormValue(field.path) ?? '')}
											oninput={(e) => setFormValue(field.path, (e.target as HTMLTextAreaElement).value)}
										></textarea>
									{:else}
										<input
											type="text"
											class="w-full rounded border px-3 py-1.5 text-sm {darkMode ? 'border-slate-600 bg-slate-800 text-slate-200' : 'border-slate-300 bg-white text-slate-900'} focus:outline-none focus:ring-2 focus:ring-indigo-500"
											value={String(getFormValue(field.path) ?? '')}
											oninput={(e) => setFormValue(field.path, (e.target as HTMLInputElement).value)}
										/>
									{/if}
								{:else if field.type === 'object' && field.children}
									<fieldset class="rounded border p-3 {darkMode ? 'border-slate-700' : 'border-slate-200'}">
										{#each field.children as child}
											{@render formField(child)}
										{/each}
									</fieldset>
								{:else}
									<textarea
										class="w-full rounded border px-3 py-1.5 text-sm font-mono min-h-[60px] resize-y {darkMode ? 'border-slate-600 bg-slate-800 text-slate-200' : 'border-slate-300 bg-white text-slate-900'} focus:outline-none focus:ring-2 focus:ring-indigo-500"
										value={formatJson(getFormValue(field.path))}
										oninput={(e) => {
											try { setFormValue(field.path, JSON.parse((e.target as HTMLTextAreaElement).value)); } catch { /* ignore partial edits */ }
										}}
									></textarea>
								{/if}
							</div>
						{/snippet}

						{#each schemaFields as field}
							{@render formField(field)}
						{/each}

						{#if formError}
							<pre class="rounded border border-red-300 bg-red-50 p-3 text-xs text-red-700 dark:border-red-700 dark:bg-red-900/20 dark:text-red-400 overflow-x-auto">{formError}</pre>
						{/if}

						<div class="flex gap-2 pt-2">
							<button
								type="button"
								class="rounded bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
								onclick={saveForm}
							>Save</button>
							<button
								type="button"
								class="rounded px-3 py-1.5 text-sm font-medium transition-colors {darkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}"
								onclick={initForm}
							>Reset</button>
						</div>
					</div>
				{:else}
					<p class="py-8 text-center text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'}">
						No schema available to generate form fields
					</p>
				{/if}
			</div>

		{:else if activeTab === 'compare'}
			<!-- COMPARE TAB -->
			<div class="p-4">
				{#if matchedSchema && schemaFields.length > 0}
					<div class="grid grid-cols-2 gap-4">
						<div>
							<h4 class="mb-2 text-sm font-semibold {darkMode ? 'text-slate-200' : 'text-slate-700'}">Schema (expected)</h4>
						</div>
						<div>
							<h4 class="mb-2 text-sm font-semibold {darkMode ? 'text-slate-200' : 'text-slate-700'}">Data (actual)</h4>
						</div>
					</div>
					{#snippet compareRow(field: FieldDescriptor, depth: number)}
						{@const status = getCompareStatus(field, topicData)}
						{@const actualVal = getNestedValue(topicData, field.path)}
						<div class="grid grid-cols-2 gap-4 py-1 border-b {darkMode ? 'border-slate-700/50' : 'border-slate-100'}" style="padding-left: {depth * 16}px">
							<div class="flex items-center gap-2">
								<span class="font-mono text-xs {darkMode ? 'text-slate-300' : 'text-slate-700'}">{field.name}</span>
								<span class="text-xs font-mono {darkMode ? 'text-slate-500' : 'text-slate-400'}">{field.type}{field.nullable ? '?' : ''}</span>
								{#if field.required}
									<span class="text-xs text-red-500">req</span>
								{/if}
							</div>
							<div class="flex items-center gap-2">
								{#if status === 'missing'}
									<span class="rounded px-1.5 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">missing</span>
								{:else if status === 'type-mismatch'}
									<span class="rounded px-1.5 py-0.5 text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">type mismatch</span>
									<span class="font-mono text-xs {darkMode ? 'text-slate-400' : 'text-slate-500'} truncate max-w-[200px]">{formatJson(actualVal)}</span>
								{:else}
									<span class="font-mono text-xs {darkMode ? 'text-slate-300' : 'text-slate-700'} truncate max-w-[250px]" title={formatJson(actualVal)}>
										{typeof actualVal === 'string' ? `"${actualVal}"` : formatJson(actualVal)}
									</span>
								{/if}
							</div>
						</div>
						{#if field.children}
							{#each field.children as child}
								{@render compareRow(child, depth + 1)}
							{/each}
						{/if}
					{/snippet}

					{#each schemaFields as field}
						{@render compareRow(field, 0)}
					{/each}

					<!-- Extra properties not in schema -->
					{#if topicData && typeof topicData === 'object'}
						{@const schemaKeys = new Set(schemaFields.map((f) => f.name))}
						{@const extraKeys = Object.keys(topicData).filter((k) => !schemaKeys.has(k))}
						{#if extraKeys.length > 0}
							<div class="mt-4">
								<h4 class="mb-1 text-xs font-medium {darkMode ? 'text-blue-400' : 'text-blue-600'}">Extra properties (not in schema)</h4>
								{#each extraKeys as key}
									<div class="flex items-center gap-2 py-1 rounded px-2 {darkMode ? 'bg-blue-900/10' : 'bg-blue-50'}">
										<span class="font-mono text-xs {darkMode ? 'text-blue-400' : 'text-blue-600'}">{key}</span>
										<span class="font-mono text-xs {darkMode ? 'text-slate-400' : 'text-slate-500'} truncate max-w-[200px]">{formatJson((topicData as Record<string, unknown>)[key])}</span>
									</div>
								{/each}
							</div>
						{/if}
					{/if}
				{:else}
					<p class="py-8 text-center text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'}">
						No schema available for comparison
					</p>
				{/if}
			</div>
		{/if}
	</div>
</div>
