<!-- src/lib/components/SchemaProperties.svelte -->
<script lang="ts">
	import type { Writable } from 'svelte/store';
	import type { SchemaProperty } from '../state';
	import Property from './Property.svelte';

	export let properties: Writable<SchemaProperty[]>;

	function addProperty() {
		const newProperty: SchemaProperty = {
			id: crypto.randomUUID(),
			name: '',
			type: 'string',
			required: false
		};
		$properties = [...$properties, newProperty];
	}

	function removeProperty(id: string) {
		$properties = $properties.filter((p) => p.id !== id);
	}
</script>

<div class="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
	<div class="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
		JSON Schema Properties
	</div>
	<div class="mb-4 flex flex-col gap-4">
		{#each $properties as property (property.id)}
			<div
				class="rounded-xl border-2 border-slate-200 bg-gradient-to-br from-white to-slate-50/50 p-5 shadow-sm transition-all duration-200 hover:border-indigo-300 hover:shadow-md"
			>
				<Property property={property} remove={removeProperty} />
			</div>
		{/each}
	</div>
	<button
		type="button"
		onclick={addProperty}
		class="mt-2 inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-white px-5 py-2.5 text-[0.9375rem] font-medium text-slate-600 shadow-sm transition-all duration-200 hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700 hover:shadow-md active:scale-[0.98]"
	>
		<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
			<path d="M8 3V13M3 8H13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
		</svg>
		Add Property
	</button>
</div>