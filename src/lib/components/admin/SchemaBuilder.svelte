<script lang="ts">
	import { schemaRegistry } from '$lib/stores/SchemaRegistry';
	import type { DynamicSchemaDefinition } from '$lib/types/models';
	import FieldRow from './FieldRow.svelte';

	interface Props {
		darkMode?: boolean;
	}

	let { darkMode = false }: Props = $props();

	let schema: DynamicSchemaDefinition = $state({
		id: 'my:schema-v1',
		name: 'New Schema',
		fields: []
	});

	let jsonPreview = $derived(JSON.stringify(schema, null, 2));

	function addRootField() {
		schema.fields.push({ name: 'root_field', type: 'string', required: true });
		schema.fields = [...schema.fields];
	}

	function removeRootField(index: number) {
		schema.fields = schema.fields.filter((_, i) => i !== index);
	}

	function register() {
		try {
			// Deep clone to ensure we're registering a snapshot
			const snapshot = structuredClone(schema);
			schemaRegistry.register(snapshot);
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
			fields: [
				{ name: 'id', type: 'string', required: true },
				{ name: 'name', type: 'string', required: true },
				{ name: 'address', type: 'string', required: true },
				{
					name: 'assetClass',
					type: 'enum',
					required: true,
					options: ['Office', 'Industrial', 'Multifamily', 'Retail', 'Hotel']
				},
				{ name: 'sqFt', type: 'number', required: true, min: 0 },
				{ name: 'yearBuilt', type: 'number', required: false, min: 1800, max: 2100 },
				{
					name: 'units',
					type: 'array',
					required: false,
					itemType: 'object',
					subFields: [
						{ name: 'unitNumber', type: 'string', required: true },
						{ name: 'rent', type: 'number', required: true, min: 0 },
						{ name: 'occupied', type: 'boolean', required: true }
					]
				}
			]
		};
	}

	function clearSchema() {
		schema = {
			id: 'my:schema-v1',
			name: 'New Schema',
			fields: []
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

		<h3 class="font-semibold mb-3 {darkMode ? 'text-slate-200' : 'text-slate-700'}">Fields</h3>
		<div class="space-y-3 mb-4">
			{#each schema.fields as field, index}
				<div class="relative">
					<FieldRow bind:field={schema.fields[index]} {darkMode} />
					<button
						onclick={() => removeRootField(index)}
						class="absolute top-0 right-0 px-2 py-1 text-xs font-medium {darkMode ? 'bg-red-900/50 hover:bg-red-800 text-red-200' : 'bg-red-100 hover:bg-red-200 text-red-700'} rounded-md transition-colors"
					>
						Remove
					</button>
				</div>
			{/each}
		</div>

		<button
			onclick={addRootField}
			class="mt-4 w-full py-2.5 border-2 border-dashed {darkMode ? 'border-slate-600 text-slate-400 hover:border-slate-500 hover:text-slate-300' : 'border-slate-300 text-slate-500 hover:border-slate-400 hover:text-slate-600'} rounded-md transition-colors font-medium"
		>
			+ Add Root Field
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
			<strong>Tip:</strong> After registering, use{' '}
			<code class="{darkMode ? 'bg-indigo-900/50' : 'bg-indigo-100'} px-1.5 py-0.5 rounded">
				mapStore.enforceTopicSchema(topic, '{schema.id}')
			</code>{' '}
			to bind a topic to this schema.
		</div>
	</div>

	<!-- Preview -->
	<div
		class="p-6 rounded-lg border {darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-900 border-slate-700'} overflow-y-auto shadow-sm"
	>
		<div
			class="sticky top-0 {darkMode ? 'bg-slate-900' : 'bg-slate-800'} p-3 mb-3 rounded-md flex justify-between items-center border-b {darkMode ? 'border-slate-800' : 'border-slate-700'}"
		>
			<h3 class="font-semibold text-white">JSON Preview</h3>
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
