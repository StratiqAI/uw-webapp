<!-- src/lib/components/Property.svelte -->
<script lang="ts">
	import type { SchemaProperty } from '../state';

	export let property: SchemaProperty;
	export let remove: (id: string) => void;
	export let isNested: boolean = false;

	function addProperty(parentProperties?: SchemaProperty[]) {
		if (!parentProperties) return;
		const newProperty: SchemaProperty = {
			id: crypto.randomUUID(),
			name: '',
			type: 'string',
			required: false
		};
		parentProperties.push(newProperty);
		property = property; // Trigger reactivity
	}

	function removeProperty(id: string, parentProperties?: SchemaProperty[]) {
		if (!parentProperties) return;
		const index = parentProperties.findIndex((p) => p.id === id);
		if (index !== -1) {
			parentProperties.splice(index, 1);
			property = property; // Trigger reactivity
		}
	}

	function handleTypeChange() {
		if (property.type === 'object') {
			property.properties = property.properties || [];
		} else {
			delete property.properties;
		}

		if (property.type === 'array') {
			property.itemType = property.itemType || 'string';
			if (property.itemType === 'object') {
				property.itemProperties = property.itemProperties || [];
			}
		} else {
			delete property.itemType;
			delete property.itemProperties;
		}
	}

	function handleArrayItemTypeChange() {
		if (property.itemType === 'object') {
			property.itemProperties = property.itemProperties || [];
		} else {
			delete property.itemProperties;
		}
	}
</script>

<div
	class:mb-3={isNested}
	class:ml-6={isNested}
	class:rounded-lg={isNested}
	class:border-2={isNested}
	class:border-slate-300={isNested}
	class:bg-white={isNested}
	class:p-4={isNested}
	class:shadow-sm={isNested}
	class:transition-all={isNested}
	class:duration-200={isNested}
	class:hover:border-indigo-300={isNested}
	class:hover:shadow-md={isNested}
>
	<div class="flex flex-wrap items-center gap-3">
		<input
			type="text"
			bind:value={property.name}
			placeholder="Property name"
			class="font-inherit w-full min-w-[180px] flex-1 rounded-lg border-2 border-slate-200 bg-white px-4 py-2.5 text-[0.9375rem] font-medium text-slate-800 shadow-sm transition-all duration-200 hover:border-indigo-300 hover:shadow-md focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
		/>
		<select
			bind:value={property.type}
			on:change={handleTypeChange}
			class="font-inherit w-auto min-w-[140px] shrink-0 rounded-lg border-2 border-slate-200 bg-white px-4 py-2.5 text-[0.9375rem] font-medium text-slate-800 shadow-sm transition-all duration-200 hover:border-indigo-300 hover:shadow-md focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
		>
			<option value="string">String</option>
			<option value="number">Number</option>
			<option value="integer">Integer</option>
			<option value="boolean">Boolean</option>
			{#if !isNested}
				<option value="object">Object</option>
				<option value="array">Array</option>
			{/if}
		</select>
		<label
			class="flex cursor-pointer select-none items-center gap-2 rounded-lg border-2 border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100 px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-all duration-200 hover:border-indigo-300 hover:shadow-md hover:from-indigo-50 hover:to-indigo-100"
		>
			<input
				type="checkbox"
				bind:checked={property.required}
				class="m-0 h-4 w-4 cursor-pointer accent-indigo-500"
			/>
			<span class="font-semibold">Required</span>
		</label>
		<button
			type="button"
			on:click={() => remove(property.id)}
			class="flex shrink-0 cursor-pointer items-center justify-center rounded-md border-none bg-transparent p-2 text-slate-500 transition-all duration-200 hover:bg-slate-100 hover:text-red-600"
			aria-label="Remove property"
			title="Remove"
		>
			<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
				<path
					d="M4 4L12 12M12 4L4 12"
					stroke="currentColor"
					stroke-width="1.5"
					stroke-linecap="round"
				/>
			</svg>
		</button>
	</div>

	{#if property.type !== 'object' && property.type !== 'array'}
		<div class="mt-4">
			<input
				type="text"
				bind:value={property.description}
				placeholder="Description (optional)"
				class="font-inherit w-full rounded-lg border-2 border-slate-200 bg-white px-4 py-2.5 text-[0.9375rem] font-medium text-slate-800 shadow-sm transition-all duration-200 hover:border-indigo-300 hover:shadow-md focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
				aria-label="Property description"
			/>
		</div>
	{/if}

	{#if property.type === 'array'}
		<div
			class="mt-4 rounded-lg border-2 border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4 shadow-sm"
		>
			<label class="flex items-center gap-3 text-sm font-semibold text-slate-700">
				Array Item Type:
				<select
					bind:value={property.itemType}
					on:change={handleArrayItemTypeChange}
					class="font-inherit w-auto min-w-[140px] shrink-0 rounded-lg border-2 border-slate-200 bg-white px-4 py-2 text-[0.9375rem] font-medium text-slate-800 shadow-sm transition-all duration-200 hover:border-indigo-300 hover:shadow-md focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
				>
					<option value="string">String</option>
					<option value="number">Number</option>
					<option value="integer">Integer</option>
					<option value="boolean">Boolean</option>
					<option value="object">Object</option>
				</select>
			</label>

			{#if property.itemType === 'object' && property.itemProperties}
				<div
					class="mt-4 rounded-lg border-2 border-slate-200 bg-gradient-to-br from-slate-100 to-slate-50 p-4 shadow-sm"
				>
					<h4 class="m-0 mb-3 text-[0.8125rem] font-semibold uppercase tracking-wide text-slate-600">
						Array Item Properties
					</h4>
					{#each property.itemProperties as itemProp (itemProp.id)}
						<svelte:self
							property={itemProp}
							remove={(id: string) => removeProperty(id, property.itemProperties)}
							isNested={true}
						/>
					{/each}
					<button
						type="button"
						on:click={() => addProperty(property.itemProperties)}
						class="mt-2 inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-white px-3 py-1.5 text-[0.8125rem] font-medium text-slate-600 shadow-sm transition-all duration-200 hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700 hover:shadow-md active:scale-[0.98]"
					>
						<svg width="14" height="14" viewBox="0 0 16 16" fill="none">
							<path
								d="M8 3V13M3 8H13"
								stroke="currentColor"
								stroke-width="1.5"
								stroke-linecap="round"
							/>
						</svg>
						Add Item Property
					</button>
				</div>
			{/if}
		</div>
	{/if}

	{#if property.type === 'object' && property.properties}
		<div
			class="mt-4 rounded-lg border-2 border-slate-200 bg-gradient-to-br from-slate-100 to-slate-50 p-4 shadow-sm"
		>
			<h4 class="m-0 mb-3 text-[0.8125rem] font-semibold uppercase tracking-wide text-slate-600">
				Nested Properties
			</h4>
			{#each property.properties as nestedProp (nestedProp.id)}
				<svelte:self
					property={nestedProp}
					remove={(id: string) => removeProperty(id, property.properties)}
					isNested={true}
				/>
			{/each}
			<button
				type="button"
				on:click={() => addProperty(property.properties)}
				class="mt-2 inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-white px-3 py-1.5 text-[0.8125rem] font-medium text-slate-600 shadow-sm transition-all duration-200 hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700 hover:shadow-md active:scale-[0.98]"
			>
				<svg width="14" height="14" viewBox="0 0 16 16" fill="none">
					<path d="M8 3V13M3 8H13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
				</svg>
				Add Nested Property
			</button>
		</div>
	{/if}
</div>