<script lang="ts">
	import { mapStore } from '$lib/stores/MapStore';
	import { schemaRegistry } from '$lib/stores/SchemaRegistry';
	import { browser } from '$app/environment';
	import type { DynamicSchemaDefinition, JsonSchemaDefinition } from '$lib/types/models';
	import JsonSchemaFormField from './JsonSchemaFormField.svelte';

	interface Props {
		darkMode?: boolean;
	}

	let { darkMode = false }: Props = $props();

	let selectedSchemaId = $state<string>('');
	let availableSchemas = $derived(schemaRegistry.getAllDefinitions());
	let selectedSchema = $derived(
		selectedSchemaId ? availableSchemas.find((s) => s.id === selectedSchemaId) : null
	);

	let topic = $state('');
	let formData = $state<Record<string, unknown>>({});
	let publishError = $state<string | null>(null);
	let publishSuccess = $state(false);

	// Convert formData to JSON string for preview
	let jsonPreview = $derived(JSON.stringify(formData, null, 2));

	// Initialize form data when schema is selected
	$effect(() => {
		if (selectedSchema && selectedSchema.jsonSchema.type === 'object') {
			// Initialize form data with empty/default values
			formData = initializeFormData(selectedSchema.jsonSchema);
		} else {
			formData = {};
		}
	});

	function initializeFormData(schema: JsonSchemaDefinition): Record<string, unknown> {
		if (schema.type !== 'object' || !schema.properties) {
			return {};
		}

		const data: Record<string, unknown> = {};

		// Initialize ALL properties, not just required ones
		// This ensures optional fields like "subtitle" appear in the form
		for (const [key, propSchema] of Object.entries(schema.properties)) {
			if (schema.required?.includes(key)) {
				// Required fields get default values
				data[key] = getDefaultValue(propSchema);
			} else {
				// Optional fields get null or empty defaults
				data[key] = getOptionalDefaultValue(propSchema);
			}
		}

		return data;
	}

	function getOptionalDefaultValue(schema: JsonSchemaDefinition): unknown {
		// For optional fields, return null or empty value based on type
		// Handle array type (e.g., ["string", "null"])
		if (Array.isArray(schema.type)) {
			const nonNullType = schema.type.find(t => t !== 'null');
			if (nonNullType === 'string') return '';
			if (nonNullType === 'number' || nonNullType === 'integer') return null;
			if (nonNullType === 'boolean') return null;
			if (nonNullType === 'array') return null;
			if (nonNullType === 'object') return null;
			return null;
		}
		// Handle anyOf (nullable types)
		if (schema.anyOf && schema.anyOf.length > 0) {
			const nonNullSchema = schema.anyOf.find(s => s.type !== 'null' && s.type);
			if (nonNullSchema) {
				if (nonNullSchema.type === 'string') return '';
				return null;
			}
		}
		// Default: return null for optional fields
		return null;
	}

	function getDefaultValue(schema: JsonSchemaDefinition): unknown {
		switch (schema.type) {
			case 'string':
				if (schema.enum && schema.enum.length > 0) {
					return schema.enum[0];
				}
				return '';
			case 'number':
			case 'integer':
				return schema.minimum !== undefined ? schema.minimum : 0;
			case 'boolean':
				return false;
			case 'array':
				return [];
			case 'object':
				if (schema.properties) {
					const obj: Record<string, unknown> = {};
					for (const [key, propSchema] of Object.entries(schema.properties)) {
						if (schema.required?.includes(key)) {
							obj[key] = getDefaultValue(propSchema);
						}
					}
					return obj;
				}
				return {};
			default:
				return null;
		}
	}

	function publish() {
		if (!selectedSchemaId || !topic.trim()) {
			publishError = 'Please select a schema and enter a topic name';
			return;
		}

		publishError = null;
		publishSuccess = false;

		try {
			// Enforce schema on topic
			mapStore.enforceTopicSchema(topic.trim(), selectedSchemaId);

			// Publish data
			const pub = mapStore.getPublisher(topic.trim(), 'schema-publisher');
			pub.publish(formData);
			pub.dispose();

			publishSuccess = true;
			setTimeout(() => {
				publishSuccess = false;
			}, 3000);
		} catch (e: any) {
			publishError = e?.message || String(e);
		}
	}

	function updateField(fieldName: string, value: unknown) {
		formData = { ...formData, [fieldName]: value };
	}

	function resetForm() {
		if (selectedSchema) {
			formData = initializeFormData(selectedSchema.jsonSchema);
		}
	}
</script>

<div class="h-full flex flex-col {darkMode ? 'bg-slate-900' : 'bg-slate-50'} p-6">
	<div class="max-w-7xl mx-auto w-full h-full flex flex-col">
		<!-- Header -->
		<div class="mb-6">
			<h2 class="text-2xl font-semibold {darkMode ? 'text-white' : 'text-slate-900'} mb-2">
				Schema Publisher
			</h2>
			<p class="text-sm {darkMode ? 'text-slate-400' : 'text-slate-600'}">
				Select a schema, fill out the form, and publish data. The data will be validated against the
				schema.
			</p>
		</div>

		<!-- Schema Selection and Topic Input -->
		<div class="grid grid-cols-2 gap-4 mb-6">
			<!-- Schema Selection -->
			<div
				class="rounded-lg border p-4 shadow-sm {darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}"
			>
				<label class="block text-sm font-medium mb-2 {darkMode ? 'text-slate-200' : 'text-slate-700'}">
					Select Schema
				</label>
				<select
					bind:value={selectedSchemaId}
					class="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 {darkMode
						? 'bg-slate-700 border-slate-600 text-white'
						: 'bg-white border-slate-300 text-slate-900'} disabled:opacity-50 disabled:cursor-not-allowed"
					disabled={availableSchemas.length === 0}
				>
					<option value="">-- Select a schema --</option>
					{#each availableSchemas as schema}
						<option value={schema.id}>{schema.id} - {schema.name}</option>
					{/each}
				</select>
			</div>

			<!-- Topic Input -->
			<div
				class="rounded-lg border p-4 shadow-sm {darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}"
			>
				<label class="block text-sm font-medium mb-2 {darkMode ? 'text-slate-200' : 'text-slate-700'}">
					Topic Name
				</label>
				<input
					bind:value={topic}
					placeholder="e.g., widget:title:my-widget-123"
					class="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 {darkMode
						? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400'
						: 'bg-white border-slate-300 text-slate-900 placeholder-slate-500'}"
				/>
			</div>
		</div>

		{#if availableSchemas.length === 0}
			<div
				class="rounded-lg border p-8 text-center {darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}"
			>
				<p class="text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'}">
					No schemas registered. Use Schema Builder to create one.
				</p>
			</div>
		{:else if !selectedSchema}
			<div
				class="rounded-lg border p-8 text-center {darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}"
			>
				<p class="text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'}">
					Select a schema to start publishing data.
				</p>
			</div>
		{:else if selectedSchema.jsonSchema.type !== 'object' || !selectedSchema.jsonSchema.properties}
			<div
				class="rounded-lg border p-8 text-center {darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}"
			>
				<p class="text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'} mb-2">
					Selected schema must be an object type with properties.
				</p>
				<details class="mt-4 text-left">
					<summary class="cursor-pointer text-xs {darkMode ? 'text-slate-400' : 'text-slate-500'}">Debug Info</summary>
					<div class="mt-2 text-xs {darkMode ? 'text-slate-400' : 'text-slate-500'} space-y-1">
						<div>Type: {selectedSchema.jsonSchema.type || 'undefined'}</div>
						<div>Has Properties: {selectedSchema.jsonSchema.properties ? 'yes' : 'no'}</div>
						<div>Property Count: {selectedSchema.jsonSchema.properties ? Object.keys(selectedSchema.jsonSchema.properties).length : 0}</div>
					</div>
					<pre class="mt-2 p-2 text-xs overflow-auto max-h-40 rounded {darkMode ? 'bg-slate-900 text-slate-300' : 'bg-slate-100 text-slate-900'}">{JSON.stringify(selectedSchema.jsonSchema, null, 2)}</pre>
				</details>
			</div>
		{:else}
			<!-- Two Column Layout: Form | JSON Preview -->
			<div class="flex-1 grid grid-cols-2 gap-6 overflow-hidden">
				<!-- Column 1: Form -->
				<div
					class="rounded-lg border p-6 shadow-sm overflow-y-auto {darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}"
				>
					<div class="flex items-center justify-between mb-4">
						<h3 class="text-lg font-semibold {darkMode ? 'text-white' : 'text-slate-900'}">
							Form Editor
						</h3>
						<button
							onclick={resetForm}
							class="text-xs px-3 py-1.5 {darkMode
								? 'bg-slate-700 hover:bg-slate-600 text-slate-200'
								: 'bg-slate-100 hover:bg-slate-200 text-slate-700'} rounded transition-colors"
						>
							Reset Form
						</button>
					</div>

					{#if selectedSchema.jsonSchema.properties}
						<div class="space-y-4">
							{#each Object.entries(selectedSchema.jsonSchema.properties) as [propName, propSchema]}
								{@const propValue = formData[propName]}
								{@const isRequired = selectedSchema.jsonSchema.required?.includes(propName) || false}
								<JsonSchemaFormField
									fieldName={propName}
									fieldSchema={propSchema}
									value={propValue}
									required={isRequired}
									{darkMode}
									onChange={(value) => updateField(propName, value)}
								/>
							{/each}
						</div>
					{/if}
				</div>

				<!-- Column 2: JSON Preview -->
				<div
					class="rounded-lg border p-6 shadow-sm flex flex-col overflow-hidden {darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}"
				>
					<h3 class="text-lg font-semibold mb-4 {darkMode ? 'text-white' : 'text-slate-900'}">
						JSON Preview
					</h3>
					<div class="flex-1 overflow-auto">
						<pre
							class="text-xs font-mono p-4 rounded-md h-full {darkMode
								? 'bg-slate-900 text-slate-300'
								: 'bg-slate-100 text-slate-900'}"
						>{jsonPreview}</pre>
					</div>
				</div>
			</div>

			<!-- Publish Button -->
			<div class="mt-6 flex items-center gap-4">
				<button
					onclick={publish}
					disabled={!selectedSchemaId || !topic.trim()}
					class="px-6 py-2.5 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white rounded-md transition-colors shadow-sm hover:shadow-md flex items-center gap-2"
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
						></path>
					</svg>
					Publish to Topic
				</button>
				{#if publishSuccess}
					<div
						class="px-4 py-2 rounded-md text-sm {darkMode ? 'bg-green-900/20 border border-green-800/50 text-green-300' : 'bg-green-50 border border-green-200 text-green-800'}"
					>
						✓ Published successfully!
					</div>
				{/if}
				{#if publishError}
					<div
						class="px-4 py-2 rounded-md text-sm {darkMode ? 'bg-red-900/20 border border-red-800/50 text-red-300' : 'bg-red-50 border border-red-200 text-red-800'}"
					>
						Error: {publishError}
					</div>
				{/if}
			</div>
		{/if}
	</div>
</div>
