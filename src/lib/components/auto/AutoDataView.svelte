<script lang="ts">
	import { schemaRegistry } from '$lib/stores/SchemaRegistry';
	import type { FieldDefinition } from '$lib/types/models';

	interface Props {
		data: unknown;
		schemaId?: string;
		topic?: string;
		fieldDef?: FieldDefinition; // For recursion
		darkMode?: boolean;
	}

	let { data, schemaId, topic, fieldDef, darkMode = false }: Props = $props();

	// If we are at the root, look up the definition
	let definition = $derived(
		!fieldDef && schemaId ? schemaRegistry.getDefinition(schemaId) : null
	);

	// Determine fields to render
	let fieldsToRender = $derived(fieldDef?.subFields ?? definition?.fields ?? []);

	// Format value based on type
	function formatValue(value: unknown, field: FieldDefinition): string {
		if (value === null || value === undefined) return '—';
		
		switch (field.type) {
			case 'date':
				if (typeof value === 'string' || typeof value === 'number') {
					try {
						return new Date(value).toLocaleDateString();
					} catch {
						return String(value);
					}
				}
				return String(value);
			case 'boolean':
				return value ? 'Yes' : 'No';
			case 'number':
				return typeof value === 'number' ? value.toLocaleString() : String(value);
			case 'enum':
				return String(value);
			default:
				return String(value);
		}
	}
</script>

<div class="auto-view h-full overflow-auto">
	<!-- SCENARIO A: It's an Object (Root or Nested) -->
	{#if fieldsToRender.length > 0 && typeof data === 'object' && !Array.isArray(data)}
		<div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 p-4">
			{#each fieldsToRender as field}
				{@const value = data[field.name]}
				<div class="font-semibold text-sm {darkMode ? 'text-slate-300' : 'text-slate-600'}">
					{field.name}
					{#if field.required}
						<span class="text-red-500 ml-1">*</span>
					{/if}
				</div>
				<div class="text-sm {darkMode ? 'text-slate-200' : 'text-slate-900'}">
					<!-- RECURSION: Render value based on type -->
					{#if field.type === 'object' && value && typeof value === 'object' && !Array.isArray(value)}
						<div class="ml-4 border-l-2 pl-3 {darkMode ? 'border-slate-600' : 'border-slate-300'}">
							<svelte:self data={value} fieldDef={field} {darkMode} />
						</div>
					{:else if field.type === 'array' && Array.isArray(value)}
						<svelte:self data={value} fieldDef={field} {darkMode} />
					{:else}
						<!-- Simple Primitive Render -->
						{formatValue(value, field)}
					{/if}
				</div>
			{/each}
		</div>

		<!-- SCENARIO B: It's an Array -->
	{:else if Array.isArray(data) && fieldDef?.itemType === 'object' && fieldDef.subFields}
		<div class="overflow-x-auto">
			<table class="min-w-full text-sm border-collapse">
				<thead class="{darkMode ? 'bg-slate-800' : 'bg-slate-50'}">
					<tr>
						{#each fieldDef.subFields as col}
							<th class="p-3 text-left font-semibold {darkMode ? 'text-slate-200' : 'text-slate-700'} border-b {darkMode ? 'border-slate-700' : 'border-slate-200'}">
								{col.name}
								{#if col.required}
									<span class="text-red-500 ml-1">*</span>
								{/if}
							</th>
						{/each}
					</tr>
				</thead>
				<tbody>
					{#each data as row, rowIndex}
						<tr class="{darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-50'} {rowIndex % 2 === 0 ? (darkMode ? 'bg-slate-900/50' : 'bg-white') : ''}">
							{#each fieldDef.subFields as col}
								{@const cellValue = row[col.name]}
								<td class="p-3 border-b {darkMode ? 'border-slate-700 text-slate-300' : 'border-slate-200 text-slate-600'}">
									<!-- RECURSION for cell content -->
									{#if col.type === 'object' && cellValue && typeof cellValue === 'object' && !Array.isArray(cellValue)}
										<div class="ml-2">
											<svelte:self data={cellValue} fieldDef={col} {darkMode} />
										</div>
									{:else if col.type === 'array' && Array.isArray(cellValue)}
										<svelte:self data={cellValue} fieldDef={col} {darkMode} />
									{:else}
										{formatValue(cellValue, col)}
									{/if}
								</td>
							{/each}
						</tr>
					{/each}
				</tbody>
			</table>
			{#if data.length === 0}
				<div class="p-4 text-center text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'}">
					No items
				</div>
			{/if}
		</div>

		<!-- SCENARIO C: Array of primitives -->
	{:else if Array.isArray(data) && (!fieldDef || fieldDef.itemType !== 'object')}
		<div class="p-4">
			<ul class="space-y-1">
				{#each data as item}
					<li class="text-sm {darkMode ? 'text-slate-300' : 'text-slate-700'}">
						• {String(item)}
					</li>
				{/each}
			</ul>
			{#if data.length === 0}
				<div class="text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'}">Empty array</div>
			{/if}
		</div>

		<!-- SCENARIO D: Primitive value -->
	{:else if data !== null && data !== undefined && typeof data !== 'object'}
		<div class="p-4 text-sm {darkMode ? 'text-slate-200' : 'text-slate-900'}">
			{String(data)}
		</div>

		<!-- SCENARIO E: Null/undefined or unknown structure -->
	{:else}
		<div class="p-4 text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'} italic">
			No data available
		</div>
	{/if}
</div>

