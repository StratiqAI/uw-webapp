<script lang="ts">
	import { validatedTopicStore } from '$lib/stores/validatedTopicStore';
	import type { JsonSchemaDefinition } from '$lib/types/models';
	import JsonSchemaFieldRow from './JsonSchemaFieldRow.svelte';

	interface Props {
		darkMode?: boolean;
	}

	let { darkMode = false }: Props = $props();

	let schema = $state({
		id: 'my:schema-v1',
		name: 'New Schema',
		description: '' as string | undefined,
		jsonSchema: {
			type: 'object' as const,
			properties: {} as Record<string, JsonSchemaDefinition>,
			required: [] as string[]
		}
	});

	let jsonPreview = $derived(JSON.stringify(schema, null, 2));

	function addRootField() {
		const fieldName = `field_${Object.keys(schema.jsonSchema.properties || {}).length + 1}`;
		if (!schema.jsonSchema.properties) {
			schema.jsonSchema.properties = {};
		}
		schema.jsonSchema.properties[fieldName] = {
			type: 'string'
		};
		if (!schema.jsonSchema.required) {
			schema.jsonSchema.required = [];
		}
		// Trigger reactivity
		schema.jsonSchema = { ...schema.jsonSchema };
	}

	function removeRootField(fieldName: string) {
		if (schema.jsonSchema.properties) {
			delete schema.jsonSchema.properties[fieldName];
		}
		if (schema.jsonSchema.required) {
			schema.jsonSchema.required = schema.jsonSchema.required.filter((r) => r !== fieldName);
		}
		// Trigger reactivity
		schema.jsonSchema = { ...schema.jsonSchema };
	}

	function register() {
		try {
			const snapshot = JSON.parse(JSON.stringify(schema));
			validatedTopicStore.registerSchema({
				id: snapshot.id,
				name: snapshot.name,
				description: snapshot.description,
				jsonSchema: snapshot.jsonSchema,
				source: 'ui'
			});
			alert(`Registered ${schema.id} successfully!`);
		} catch (e: any) {
			alert('Error compiling schema: ' + (e?.message || String(e)));
			console.error('Schema registration error:', e);
		}
	}

	function loadExample() {
		schema = {
			id: 'example:property-v1',
			name: 'Property Example',
			description: 'Example commercial real estate property schema',
			jsonSchema: {
				type: 'object',
				properties: {
					id: { type: 'string', description: 'Property identifier' },
					name: { type: 'string', description: 'Property name' },
					address: { type: 'string', description: 'Property address' },
					assetClass: {
						type: 'string',
						enum: ['Office', 'Industrial', 'Multifamily', 'Retail', 'Hotel'],
						description: 'Asset class type'
					},
					sqFt: { type: 'number', minimum: 0, description: 'Square footage' },
					yearBuilt: {
						type: 'number',
						minimum: 1800,
						maximum: 2100,
						description: 'Year built'
					},
					units: {
						type: 'array',
						items: {
							type: 'object',
							properties: {
								unitNumber: { type: 'string' },
								rent: { type: 'number', minimum: 0 },
								occupied: { type: 'boolean' }
							},
							required: ['unitNumber', 'rent', 'occupied']
						},
						description: 'List of units'
					}
				},
				required: ['id', 'name', 'address', 'assetClass', 'sqFt']
			}
		};
	}

	function clearSchema() {
		schema = {
			id: 'my:schema-v1',
			name: 'New Schema',
			description: undefined,
			jsonSchema: {
				type: 'object' as const,
				properties: {} as Record<string, JsonSchemaDefinition>,
				required: [] as string[]
			}
		};
	}
</script>

<div class="grid grid-cols-2 gap-6 h-full p-6">
	<!-- Editor -->
	<div
		class="p-6 rounded-lg border {darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} overflow-y-auto shadow-sm"
	>
		<div class="flex justify-between items-center mb-6">
			<h2 class="text-xl font-semibold {darkMode ? 'text-white' : 'text-slate-900'}">Schema Definition</h2>
			<div class="flex gap-2">
				<button
					onclick={loadExample}
					class="px-3 py-1.5 text-sm font-medium {darkMode ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'} rounded-md transition-colors"
				>
					Load Example
				</button>
				<button
					onclick={clearSchema}
					class="px-3 py-1.5 text-sm font-medium {darkMode ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'} rounded-md transition-colors"
				>
					Clear
				</button>
			</div>
		</div>

		<div class="mb-6 space-y-4">
			<div>
				<label class="block text-sm font-medium {darkMode ? 'text-slate-300' : 'text-slate-700'} mb-2">
					Schema ID
				</label>
				<input
					bind:value={schema.id}
					placeholder="Schema ID (e.g. cre:prop)"
					class="w-full rounded-md border {darkMode ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-500'} px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
				/>
			</div>
			<div>
				<label class="block text-sm font-medium {darkMode ? 'text-slate-300' : 'text-slate-700'} mb-2">
					Human Name
				</label>
				<input
					bind:value={schema.name}
					placeholder="Human Name"
					class="w-full rounded-md border {darkMode ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-500'} px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
				/>
			</div>
		</div>

		<h3 class="font-semibold mb-3 {darkMode ? 'text-slate-200' : 'text-slate-700'}">Properties</h3>
		<div class="space-y-3 mb-4">
			{#if schema.jsonSchema.properties}
				{#each Object.entries(schema.jsonSchema.properties) as [fieldName, fieldSchema]}
					<div class="relative">
						<JsonSchemaFieldRow
							{fieldName}
							fieldSchema={schema.jsonSchema.properties[fieldName]}
							required={schema.jsonSchema.required?.includes(fieldName) || false}
							onUpdate={(name, updatedSchema, isRequired) => {
								// Update property
								if (name !== fieldName && schema.jsonSchema.properties) {
									// Renamed
									delete schema.jsonSchema.properties[fieldName];
									schema.jsonSchema.properties[name] = updatedSchema;
								} else if (schema.jsonSchema.properties) {
									schema.jsonSchema.properties[fieldName] = updatedSchema;
								}

								// Update required array
								if (!schema.jsonSchema.required) {
									schema.jsonSchema.required = [];
								}
								if (isRequired && !schema.jsonSchema.required.includes(name)) {
									schema.jsonSchema.required.push(name);
								} else if (!isRequired) {
									schema.jsonSchema.required = schema.jsonSchema.required.filter((r) => r !== name);
								}

								// Trigger reactivity
								schema.jsonSchema = { ...schema.jsonSchema };
							}}
							onRemove={() => removeRootField(fieldName)}
							{darkMode}
						/>
					</div>
				{/each}
			{/if}
		</div>

		<button
			onclick={addRootField}
			class="mt-4 w-full py-2.5 border-2 border-dashed {darkMode ? 'border-slate-600 text-slate-400 hover:border-slate-500 hover:text-slate-300' : 'border-slate-300 text-slate-500 hover:border-slate-400 hover:text-slate-600'} rounded-md transition-colors font-medium"
		>
			+ Add Property
		</button>

		<button
			onclick={register}
			class="mt-6 w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors font-semibold shadow-sm hover:shadow-md"
		>
			Register to Core
		</button>

		<div
			class="mt-4 p-3 rounded-md text-sm {darkMode ? 'bg-indigo-900/20 border border-indigo-800/50 text-indigo-200' : 'bg-indigo-50 border border-indigo-200 text-indigo-800'}"
		>
			<strong>Tip:</strong> This schema is registered as catalog-only. To also validate
			published data, re-register with a <code class="{darkMode ? 'bg-indigo-900/50' : 'bg-indigo-100'} px-1.5 py-0.5 rounded">topicPattern</code>.
		</div>
	</div>

	<!-- Preview -->
	<div
		class="p-6 rounded-lg border {darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-900 border-slate-700'} overflow-y-auto shadow-sm"
	>
		<div
			class="sticky top-0 {darkMode ? 'bg-slate-900' : 'bg-slate-800'} p-3 mb-3 rounded-md flex justify-between items-center border-b {darkMode ? 'border-slate-800' : 'border-slate-700'}"
		>
			<h3 class="font-semibold text-white">JSON Schema Preview</h3>
			<button
				onclick={() => {
					navigator.clipboard.writeText(jsonPreview);
					alert('Copied to clipboard!');
				}}
				class="px-3 py-1 text-xs font-medium bg-slate-700 hover:bg-slate-600 text-white rounded-md transition-colors"
			>
				Copy
			</button>
		</div>
		<pre class="whitespace-pre-wrap break-words text-green-400 font-mono text-sm">{jsonPreview}</pre>
	</div>
</div>
