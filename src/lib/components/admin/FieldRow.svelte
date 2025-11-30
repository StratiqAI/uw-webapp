<script lang="ts">
	import type { FieldDefinition, FieldType } from '$lib/types/models';

	interface Props {
		field: FieldDefinition;
		darkMode?: boolean;
	}

	let { field = $bindable(), darkMode = false }: Props = $props();

	const types: FieldType[] = ['string', 'number', 'boolean', 'date', 'enum', 'object', 'array'];

	function addSubField() {
		if (!field.subFields) {
			field.subFields = [];
		}
		field.subFields.push({ name: 'new_field', type: 'string', required: true });
		// Trigger reactivity
		field.subFields = [...field.subFields];
	}

	function removeSubField(index: number) {
		if (field.subFields) {
			field.subFields = field.subFields.filter((_, i) => i !== index);
		}
	}
</script>

<div
	class="border-l-2 pl-4 my-3 {darkMode ? 'border-slate-600' : 'border-slate-300'}"
>
	<div class="flex gap-2 items-center flex-wrap">
		<input
			bind:value={field.name}
			placeholder="Field Name"
			class="flex-1 min-w-[120px] rounded-md border px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 {darkMode
				? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400'
				: 'bg-white border-slate-300 text-slate-900 placeholder-slate-500'}"
		/>

		<select
			bind:value={field.type}
			class="rounded-md border px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 {darkMode
				? 'bg-slate-700 border-slate-600 text-white'
				: 'bg-white border-slate-300 text-slate-900'}"
		>
			{#each types as t}
				<option value={t}>{t}</option>
			{/each}
		</select>

		<label class="flex gap-1.5 items-center cursor-pointer">
			<input
				type="checkbox"
				bind:checked={field.required}
				class="h-4 w-4 rounded {darkMode ? 'text-indigo-500' : 'text-indigo-600'} focus:ring-indigo-500"
			/>
			<span class="text-sm {darkMode ? 'text-slate-300' : 'text-slate-700'}">Required</span>
		</label>

		{#if field.type === 'enum'}
			<div class="flex gap-1.5 items-center">
				<span class="text-sm {darkMode ? 'text-slate-400' : 'text-slate-600'}">Options:</span>
				<input
					bind:value={field.options}
					placeholder="comma,separated,values"
					class="min-w-[150px] rounded-md border px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 {darkMode
						? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400'
						: 'bg-white border-slate-300 text-slate-900 placeholder-slate-500'}"
					oninput={(e) => {
						const value = (e.target as HTMLInputElement).value;
						field.options = value.split(',').map((s) => s.trim()).filter((s) => s.length > 0);
					}}
				/>
			</div>
		{/if}

		{#if field.type === 'number'}
			<div class="flex gap-1.5 items-center">
				<input
					type="number"
					bind:value={field.min}
					placeholder="Min"
					class="w-20 rounded-md border px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 {darkMode
						? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400'
						: 'bg-white border-slate-300 text-slate-900 placeholder-slate-500'}"
				/>
				<input
					type="number"
					bind:value={field.max}
					placeholder="Max"
					class="w-20 rounded-md border px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 {darkMode
						? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400'
						: 'bg-white border-slate-300 text-slate-900 placeholder-slate-500'}"
				/>
			</div>
		{/if}

		{#if field.type === 'object' || (field.type === 'array' && field.itemType === 'object')}
			<button
				onclick={addSubField}
				class="px-2 py-1 text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors"
			>
				+ Sub-field
			</button>
		{/if}
	</div>

	{#if field.description !== undefined}
		<input
			bind:value={field.description}
			placeholder="Description (optional)"
			class="w-full mt-2 rounded-md border px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 {darkMode
				? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400'
				: 'bg-white border-slate-300 text-slate-900 placeholder-slate-500'}"
		/>
	{:else}
		<button
			onclick={() => {
				field.description = '';
			}}
			class="text-xs {darkMode ? 'text-slate-400 hover:text-slate-300' : 'text-slate-500 hover:text-slate-600'} mt-1 transition-colors"
		>
			+ Add description
		</button>
	{/if}

	<!-- Recursive Rendering for Objects -->
	{#if field.type === 'object' && field.subFields}
		<div class="mt-3 space-y-3">
			{#each field.subFields as subField, index}
				<div class="relative">
					<svelte:self bind:field={field.subFields[index]} {darkMode} />
					<button
						onclick={() => removeSubField(index)}
						class="absolute top-0 right-0 px-2 py-1 text-xs font-medium {darkMode
							? 'bg-red-900/50 hover:bg-red-800 text-red-200'
							: 'bg-red-100 hover:bg-red-200 text-red-700'} rounded-md transition-colors"
					>
						×
					</button>
				</div>
			{/each}
		</div>
	{/if}

	<!-- Recursive Rendering for Arrays of Objects -->
	{#if field.type === 'array'}
		<div class="ml-4 mt-3">
			<div class="text-sm mb-2 {darkMode ? 'text-slate-400' : 'text-slate-500'}">Array Item Type:</div>
			<select
				bind:value={field.itemType}
				class="mb-3 rounded-md border px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 {darkMode
					? 'bg-slate-700 border-slate-600 text-white'
					: 'bg-white border-slate-300 text-slate-900'}"
			>
				{#each types as t}
					<option value={t}>{t}</option>
				{/each}
			</select>

			{#if field.itemType === 'object'}
				{#if !field.subFields}
					<!-- Initialize subfields if missing -->
					{(field.subFields = []) && ''}
				{/if}
				<div class="space-y-3">
					{#each field.subFields as subField, index}
						<div class="relative">
							<svelte:self bind:field={field.subFields[index]} {darkMode} />
							<button
								onclick={() => removeSubField(index)}
								class="absolute top-0 right-0 px-2 py-1 text-xs font-medium {darkMode
									? 'bg-red-900/50 hover:bg-red-800 text-red-200'
									: 'bg-red-100 hover:bg-red-200 text-red-700'} rounded-md transition-colors"
							>
								×
							</button>
						</div>
					{/each}
				</div>
				<button
					onclick={addSubField}
					class="mt-3 px-2 py-1 text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors"
				>
					+ Add Field to Item
				</button>
			{/if}
		</div>
	{/if}
</div>
