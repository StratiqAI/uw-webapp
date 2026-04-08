<script lang="ts">
	import WorkflowModal from './WorkflowModal.svelte';
	import JsonSchemaFieldRow from '$lib/components/schemas/JsonSchemaFieldRow.svelte';
	import JsonSchemaPickerModal from '$lib/components/schemas/JsonSchemaPickerModal.svelte';
	import type { JsonSchemaDefinition } from '$lib/types/models';
	import type { IGraphQLQueryClient } from '$lib/services/realtime/store/GraphQLQueryClient';
	import Ajv from 'ajv';
	import addFormats from 'ajv-formats';

	const ajv = new Ajv({ allErrors: true });
	addFormats(ajv);

	let {
		darkMode = false,
		outputSchema = $bindable(null),
		queryClient,
		projectId = '',
		selectedJsonSchemaId,
		onSave,
		onClose
	}: {
		darkMode?: boolean;
		outputSchema?: Record<string, unknown> | null;
		queryClient?: IGraphQLQueryClient;
		projectId?: string;
		selectedJsonSchemaId?: string;
		onSave?: (pickedSchemaId?: string) => void;
		onClose?: () => void;
	} = $props();

	let showPicker = $state(false);
	let pickedSchemaId = $state<string | undefined>(undefined);

	type Tab = 'build' | 'json';
	let activeTab = $state<Tab>('build');
	let schemaError = $state('');
	let isValid = $state(true);

	// Builder state: root object schema
	let rootSchema = $state<JsonSchemaDefinition>({
		type: 'object',
		properties: {},
		required: []
	});

	// JSON tab state
	let schemaText = $state('');

	// Initialize from outputSchema
	function normalizeToObjectSchema(raw: Record<string, unknown> | null): JsonSchemaDefinition {
		if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
			return { type: 'object', properties: {}, required: [] };
		}
		const properties = (raw.properties as Record<string, JsonSchemaDefinition>) || {};
		const keys = Object.keys(properties);
		// All fields are required in workflow output schema
		return { type: 'object', properties: { ...properties }, required: [...keys] };
	}

	function objectSchemaToRecord(schema: JsonSchemaDefinition): Record<string, unknown> {
		return schema as unknown as Record<string, unknown>;
	}

	$effect(() => {
		if (outputSchema != null && Object.keys(outputSchema).length > 0) {
			rootSchema = normalizeToObjectSchema(outputSchema as Record<string, unknown>);
			schemaText = JSON.stringify(objectSchemaToRecord(rootSchema), null, 2);
			schemaError = '';
			isValid = true;
		} else {
			rootSchema = { type: 'object', properties: {}, required: [] };
			schemaText = '';
			schemaError = '';
			isValid = true;
		}
	});

	function validateParsedSchema(parsed: unknown): boolean {
		schemaError = '';
		if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
			schemaError = 'Schema must be a JSON object';
			return false;
		}
		try {
			ajv.compile(parsed as object);
			return true;
		} catch (e: any) {
			schemaError = e?.message || 'Invalid JSON Schema structure';
			return false;
		}
	}

	function switchToJson() {
		schemaText = JSON.stringify(objectSchemaToRecord(rootSchema), null, 2);
		activeTab = 'json';
		schemaError = '';
		isValid = true;
	}

	function switchToBuild() {
		if (!schemaText.trim()) {
			rootSchema = { type: 'object', properties: {}, required: [] };
			activeTab = 'build';
			schemaError = '';
			isValid = true;
			return;
		}
		try {
			const parsed = JSON.parse(schemaText) as Record<string, unknown>;
			if (validateParsedSchema(parsed)) {
				rootSchema = normalizeToObjectSchema(parsed);
				activeTab = 'build';
			}
		} catch (e: any) {
			schemaError = e?.message || 'Invalid JSON';
		}
	}

	function addRootField() {
		const fieldName = `field_${Object.keys(rootSchema.properties || {}).length + 1}`;
		if (!rootSchema.properties) rootSchema.properties = {};
		rootSchema.properties[fieldName] = { type: 'string' };
		const keys = Object.keys(rootSchema.properties);
		rootSchema = { ...rootSchema, properties: { ...rootSchema.properties }, required: keys };
	}

	function removeRootField(fieldName: string) {
		if (rootSchema.properties) {
			const next = { ...rootSchema.properties };
			delete next[fieldName];
			rootSchema = {
				...rootSchema,
				properties: next,
				required: Object.keys(next)
			};
		}
	}

	// Derive current schema from builder for preview/save
	let currentSchemaForSave = $derived.by((): Record<string, unknown> | null => {
		if (activeTab === 'build') {
			const hasProps = rootSchema.properties && Object.keys(rootSchema.properties).length > 0;
			if (!hasProps) return null;
			return objectSchemaToRecord(rootSchema);
		}
		if (!schemaText.trim()) return null;
		try {
			const parsed = JSON.parse(schemaText) as Record<string, unknown>;
			if (validateParsedSchema(parsed)) return parsed;
		} catch {
			// invalid
		}
		return null;
	});

	/** Returns path of first property missing a description, or null if all have descriptions. */
	function firstMissingDescription(schema: JsonSchemaDefinition, path = ''): string | null {
		if (schema.type !== 'object' || !schema.properties) return null;
		for (const [key, sub] of Object.entries(schema.properties)) {
			const subPath = path ? `${path}.${key}` : key;
			const desc = sub.description;
			if (typeof desc !== 'string' || !desc.trim()) return subPath;
			const nested = firstMissingDescription(sub, subPath);
			if (nested) return nested;
		}
		if (schema.items && schema.items.type === 'object' && schema.items.properties) {
			for (const [key, sub] of Object.entries(schema.items.properties)) {
				const subPath = path ? `${path}[]${key}` : `[]${key}`;
				const desc = sub.description;
				if (typeof desc !== 'string' || !desc.trim()) return subPath;
				const nested = firstMissingDescription(sub, subPath);
				if (nested) return nested;
			}
		}
		return null;
	}

	function handlePickFromLibrary(schema: { id: string; jsonSchemaId: string; schemaDefinition: string }) {
		showPicker = false;
		pickedSchemaId = schema.jsonSchemaId || schema.id;
		try {
			const parsed =
				typeof schema.schemaDefinition === 'string'
					? JSON.parse(schema.schemaDefinition)
					: schema.schemaDefinition;
			outputSchema = parsed as Record<string, unknown>;
			rootSchema = normalizeToObjectSchema(parsed);
			schemaText = JSON.stringify(parsed, null, 2);
			schemaError = '';
			isValid = true;
		} catch {
			schemaError = 'Failed to parse selected schema definition';
		}
	}

	function handleSave() {
		if (activeTab === 'build') schemaError = '';
		if (activeTab === 'json' && schemaText.trim()) {
			try {
				const parsed = JSON.parse(schemaText) as Record<string, unknown>;
				if (!validateParsedSchema(parsed)) return;
				outputSchema = parsed;
			} catch (e: any) {
				schemaError = e?.message || 'Invalid JSON';
				return;
			}
		} else if (activeTab === 'build') {
			const missing = firstMissingDescription(rootSchema);
			if (missing) {
				schemaError = `Description is required for every property. Please add a description for "${missing}".`;
				return;
			}
			outputSchema = currentSchemaForSave ?? null;
		} else {
			outputSchema = currentSchemaForSave ?? null;
		}
		onSave?.(pickedSchemaId);
		onClose?.();
	}

	function handleCancel() {
		onClose?.();
	}

	const exampleSchema: Record<string, unknown> = {
		type: 'object',
		properties: {
			result: {
				type: 'string',
				description: 'The workflow result'
			},
			metadata: {
				type: 'object',
				description: 'Execution metadata (timestamp and status)',
				properties: {
					timestamp: {
						type: 'string',
						format: 'date-time',
						description: 'ISO 8601 date-time when the workflow completed'
					},
					status: {
						type: 'string',
						enum: ['success', 'warning', 'error'],
						description: 'Overall outcome of the workflow run'
					}
				},
				required: ['timestamp', 'status']
			}
		},
		required: ['result', 'metadata']
	};

	function insertExample() {
		if (activeTab === 'json') {
			schemaText = JSON.stringify(exampleSchema, null, 2);
			validateParsedSchema(exampleSchema);
		} else {
			rootSchema = normalizeToObjectSchema(exampleSchema);
		}
	}

	function handleJsonInput() {
		if (!schemaText.trim()) {
			schemaError = '';
			isValid = true;
			return;
		}
		try {
			const parsed = JSON.parse(schemaText);
			isValid = validateParsedSchema(parsed);
		} catch (e: any) {
			schemaError = e?.message || 'Invalid JSON';
			isValid = false;
		}
	}

	const canSave = $derived(
		activeTab === 'build' ? true : activeTab === 'json' && (schemaText.trim() === '' || isValid)
	);
</script>

<WorkflowModal
	{darkMode}
	labelledBy="workflow-output-schema-title"
	maxWidthClass="max-w-4xl"
	maxHeightClass="max-h-[88vh]"
	onClose={handleCancel}
>
	<div class="flex flex-col h-full max-h-[88vh] overflow-hidden">
		<!-- Header with accent -->
		<div
			class="shrink-0 px-6 pt-5 pb-4 border-b {darkMode ? 'border-slate-700 bg-gradient-to-b from-indigo-950/40 to-slate-800' : 'border-slate-200 bg-gradient-to-b from-slate-50 to-white'}"
		>
			<div class="flex items-start gap-4">
				<div
					class="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center {darkMode ? 'bg-indigo-600/80 text-white' : 'bg-indigo-100 text-indigo-600'}"
					aria-hidden="true"
				>
					<svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
						<path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
					</svg>
				</div>
				<div class="min-w-0 flex-1">
					<h2
						id="workflow-output-schema-title"
						class="text-xl font-semibold {darkMode ? 'text-white' : 'text-slate-900'}"
					>
						Workflow Output Schema
					</h2>
					<p class="text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'} mt-1">
						Define the shape of your workflow output. Use the builder to add properties and types, or edit JSON directly. This schema is validated when the workflow completes.
					</p>
				</div>
			</div>

			<!-- Tabs + Insert Example -->
			<div class="flex items-center justify-between mt-5 gap-4 flex-wrap">
				<div class="flex rounded-lg p-0.5 {darkMode ? 'bg-slate-700' : 'bg-slate-200'}">
					<button
						type="button"
						onclick={() => (activeTab === 'json' ? switchToBuild() : (activeTab = 'build'))}
						class="px-4 py-2 text-sm font-medium rounded-md transition-colors {activeTab === 'build'
							? darkMode
								? 'bg-slate-600 text-white shadow'
								: 'bg-white text-slate-900 shadow'
							: darkMode
								? 'text-slate-300 hover:text-white'
								: 'text-slate-600 hover:text-slate-900'}"
					>
						Build
					</button>
					<button
						type="button"
						onclick={switchToJson}
						class="px-4 py-2 text-sm font-medium rounded-md transition-colors {activeTab === 'json'
							? darkMode
								? 'bg-slate-600 text-white shadow'
								: 'bg-white text-slate-900 shadow'
							: darkMode
								? 'text-slate-300 hover:text-white'
								: 'text-slate-600 hover:text-slate-900'}"
					>
						JSON
					</button>
				</div>
			<div class="flex items-center gap-2">
				{#if queryClient}
					<button
						type="button"
						onclick={() => (showPicker = true)}
						class="text-sm font-medium px-3 py-1.5 rounded-md {darkMode
							? 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-900/30'
							: 'text-emerald-700 hover:bg-emerald-100'} transition-colors"
					>
						Pick from Library
					</button>
				{/if}
				<button
					type="button"
					onclick={insertExample}
					class="text-sm font-medium px-3 py-1.5 rounded-md {darkMode
						? 'text-amber-400 hover:text-amber-300 hover:bg-amber-900/30'
						: 'text-amber-700 hover:bg-amber-100'} transition-colors"
				>
					Insert example
				</button>
			</div>
			</div>
		</div>

		<!-- Content -->
		<div class="flex-1 min-h-0 flex flex-col overflow-hidden px-6 py-4">
			{#if activeTab === 'build'}
				<div class="flex-1 overflow-y-auto min-h-0">
					<div
						class="rounded-xl border p-5 {darkMode ? 'bg-slate-800/60 border-slate-600' : 'bg-slate-50/80 border-slate-200'}"
					>
						<div class="flex items-center justify-between mb-4">
							<span class="text-sm font-medium {darkMode ? 'text-slate-300' : 'text-slate-700'}">Properties</span>
						</div>
						<div class="space-y-3 mb-4">
							{#if rootSchema.properties && Object.keys(rootSchema.properties).length > 0}
								{#each Object.entries(rootSchema.properties) as [fieldName, fieldSchema]}
									<div class="relative">
										<JsonSchemaFieldRow
											{fieldName}
											fieldSchema={fieldSchema}
											required={true}
											onUpdate={(name, updatedSchema) => {
												if (!rootSchema.properties) return;
												const prevKey = fieldName;
												const props = { ...rootSchema.properties };
												if (name !== prevKey) {
													delete props[prevKey];
													props[name] = updatedSchema;
												} else {
													props[name] = updatedSchema;
												}
												// All fields required in workflow output schema
												rootSchema = { ...rootSchema, properties: props, required: Object.keys(props) };
											}}
											onRemove={() => removeRootField(fieldName)}
											showRequiredCheckbox={false}
											descriptionRequired={true}
											{darkMode}
										/>
									</div>
								{/each}
							{:else}
								<p class="text-sm {darkMode ? 'text-slate-500' : 'text-slate-500'} py-4 text-center">
									No properties yet. Add one below or switch to JSON to paste a schema.
								</p>
							{/if}
						</div>
						<button
							type="button"
							onclick={addRootField}
							class="w-full py-2.5 border-2 border-dashed rounded-lg font-medium text-sm transition-colors {darkMode
								? 'border-slate-600 text-slate-400 hover:border-indigo-500 hover:text-indigo-300'
								: 'border-slate-300 text-slate-500 hover:border-indigo-400 hover:text-indigo-600'}"
						>
							+ Add property
						</button>
					</div>
				</div>
			{:else}
				<div class="flex-1 min-h-[50vh] flex flex-col">
					<label for="schema-textarea" class="sr-only">JSON Schema</label>
					<textarea
						id="schema-textarea"
						bind:value={schemaText}
						oninput={handleJsonInput}
						placeholder={'{"type": "object", "properties": {}, "required": []}'}
						class="flex-1 min-h-[44vh] w-full p-4 font-mono text-sm rounded-xl border resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent {darkMode
							? 'bg-slate-900 text-slate-100 border-slate-600 placeholder-slate-500'
							: 'bg-slate-50 text-slate-900 border-slate-200 placeholder-slate-400'}"
						spellcheck="false"
					></textarea>
					{#if schemaError}
						<div
							class="mt-3 px-3 py-2 rounded-lg text-sm bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400"
						>
							{schemaError}
						</div>
					{:else if isValid && schemaText.trim()}
						<div
							class="mt-3 px-3 py-2 rounded-lg text-sm bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
						>
							✓ Valid JSON Schema
						</div>
					{/if}
				</div>
			{/if}

			{#if schemaError && activeTab === 'build'}
				<div
					class="mt-4 px-4 py-3 rounded-xl text-sm bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 shrink-0"
				>
					{schemaError}
				</div>
			{/if}

			<!-- Tip -->
			<div
				class="mt-4 px-4 py-3 rounded-xl border shrink-0 {darkMode
					? 'bg-slate-800/50 border-slate-700 text-slate-400'
					: 'bg-slate-50 border-slate-200 text-slate-600'}"
			>
				<p class="text-xs">
					<strong class={darkMode ? 'text-slate-300' : 'text-slate-700'}>Tip:</strong>
					Leave empty (no properties) to allow any output format. The schema is validated when the workflow execution completes.
				</p>
			</div>
		</div>

		<!-- Footer -->
		<div
			class="shrink-0 flex items-center justify-end gap-3 px-6 py-4 border-t {darkMode ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-slate-50/50'}"
		>
			<button
				type="button"
				onclick={handleCancel}
				class="px-4 py-2 text-sm font-medium rounded-lg transition-colors {darkMode
					? 'text-slate-300 hover:text-slate-100 hover:bg-slate-700'
					: 'text-slate-700 hover:bg-slate-200'}"
			>
				Cancel
			</button>
			<button
				type="button"
				onclick={handleSave}
				disabled={activeTab === 'json' && schemaText.trim() !== '' && !isValid}
				class="px-4 py-2 text-sm font-medium text-white rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm hover:shadow"
			>
				Save schema
			</button>
		</div>
	</div>
</WorkflowModal>

{#if showPicker && queryClient}
	<JsonSchemaPickerModal
		{darkMode}
		{queryClient}
		{projectId}
		selectedSchemaId={pickedSchemaId ?? selectedJsonSchemaId}
		onselect={(schema) => handlePickFromLibrary(schema)}
		onclose={() => (showPicker = false)}
	/>
{/if}
