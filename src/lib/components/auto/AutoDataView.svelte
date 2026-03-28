<script lang="ts">
	import { validatedTopicStore } from '$lib/stores/validatedTopicStore';
	import type { JsonSchemaDefinition } from '$lib/types/models';
	import AutoDataView from './AutoDataView.svelte';

	interface Props {
		data: unknown;
		schemaId?: string;
		topic?: string;
		fieldSchema?: JsonSchemaDefinition; // For recursion
		darkMode?: boolean;
	}

	let { data, schemaId, topic, fieldSchema, darkMode = false }: Props = $props();

	let rootSchema = $derived(
		!fieldSchema && schemaId ? validatedTopicStore.getJsonSchemaById(schemaId) : null
	);

	// Determine schema to use (fieldSchema for recursion, rootSchema for root)
	let currentSchema = $derived(fieldSchema || rootSchema);

	// Get properties to render (for objects)
	let properties = $derived(
		currentSchema?.type === 'object' && currentSchema.properties
			? Object.entries(currentSchema.properties)
			: []
	);

	let requiredFields = $derived(currentSchema?.required || []);

	// Format value based on schema type
	function formatValue(value: unknown, schema: JsonSchemaDefinition): string {
		if (value === null || value === undefined) return '—';

		switch (schema.type) {
			case 'string':
				if (schema.format === 'date-time') {
					try {
						return new Date(value as string).toLocaleString();
					} catch {
						return String(value);
					}
				}
				return String(value);
			case 'boolean':
				return value ? 'Yes' : 'No';
			case 'number':
			case 'integer':
				return typeof value === 'number' ? value.toLocaleString() : String(value);
			default:
				return String(value);
		}
	}
</script>

<div class="auto-view h-full overflow-auto">
	<!-- SCENARIO A: It's an Object (Root or Nested) -->
	{#if currentSchema?.type === 'object' && properties.length > 0 && typeof data === 'object' && !Array.isArray(data)}
		<div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 p-4">
			{#each properties as [propName, propSchema]}
				{@const value = (data as Record<string, unknown>)[propName]}
				<div class="font-semibold text-sm {darkMode ? 'text-slate-300' : 'text-slate-600'}">
					{propName}
					{#if requiredFields.includes(propName)}
						<span class="text-red-500 ml-1">*</span>
					{/if}
					{#if propSchema.description}
						<span class="text-xs font-normal {darkMode ? 'text-slate-500' : 'text-slate-400'} ml-2">
							({propSchema.description})
						</span>
					{/if}
				</div>
				<div class="text-sm {darkMode ? 'text-slate-200' : 'text-slate-900'}">
					<!-- RECURSION: Render value based on type -->
					{#if propSchema.type === 'object' && value && typeof value === 'object' && !Array.isArray(value)}
						<div class="ml-4 border-l-2 pl-3 {darkMode ? 'border-slate-600' : 'border-slate-300'}">
							<AutoDataView data={value} fieldSchema={propSchema} {darkMode} />
						</div>
					{:else if propSchema.type === 'array' && Array.isArray(value)}
						<AutoDataView data={value} fieldSchema={propSchema} {darkMode} />
					{:else}
						<!-- Simple Primitive Render -->
						{formatValue(value, propSchema)}
					{/if}
				</div>
			{/each}
		</div>

		<!-- SCENARIO B: It's an Array of Objects -->
	{:else if currentSchema?.type === 'array' && currentSchema.items?.type === 'object' && Array.isArray(data)}
		<div class="overflow-x-auto">
			{#if currentSchema.items.properties}
				{@const itemProperties = Object.entries(currentSchema.items.properties)}
				{@const itemRequired = currentSchema.items.required || []}
				<table class="min-w-full text-sm border-collapse">
					<thead class="{darkMode ? 'bg-slate-800' : 'bg-slate-50'}">
						<tr>
							{#each itemProperties as [colName, colSchema]}
								<th class="p-3 text-left font-semibold {darkMode ? 'text-slate-200' : 'text-slate-700'} border-b {darkMode ? 'border-slate-700' : 'border-slate-200'}">
									{colName}
									{#if itemRequired.includes(colName)}
										<span class="text-red-500 ml-1">*</span>
									{/if}
								</th>
							{/each}
						</tr>
					</thead>
					<tbody>
						{#each data as row, rowIndex}
							<tr class="{darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-50'} {rowIndex % 2 === 0 ? (darkMode ? 'bg-slate-900/50' : 'bg-white') : ''}">
								{#each itemProperties as [colName, colSchema]}
									{@const cellValue = (row as Record<string, unknown>)[colName]}
									<td class="p-3 border-b {darkMode ? 'border-slate-700 text-slate-300' : 'border-slate-200 text-slate-600'}">
										<!-- RECURSION for cell content -->
										{#if colSchema.type === 'object' && cellValue && typeof cellValue === 'object' && !Array.isArray(cellValue)}
											<div class="ml-2">
												<AutoDataView data={cellValue} fieldSchema={colSchema} {darkMode} />
											</div>
										{:else if colSchema.type === 'array' && Array.isArray(cellValue)}
											<AutoDataView data={cellValue} fieldSchema={colSchema} {darkMode} />
										{:else}
											{formatValue(cellValue, colSchema)}
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
			{:else}
				<!-- Array of objects but no schema defined -->
				<div class="p-4">
					<ul class="space-y-1">
						{#each data as item}
							<li class="text-sm {darkMode ? 'text-slate-300' : 'text-slate-700'}">
								• {JSON.stringify(item)}
							</li>
						{/each}
					</ul>
				</div>
			{/if}
		</div>

		<!-- SCENARIO C: Array of primitives -->
	{:else if currentSchema?.type === 'array' && Array.isArray(data) && currentSchema.items?.type !== 'object'}
		<div class="p-4">
			<ul class="space-y-1">
				{#each data as item}
					<li class="text-sm {darkMode ? 'text-slate-300' : 'text-slate-700'}">
						• {formatValue(item, currentSchema.items || { type: 'string' })}
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
			{formatValue(data, currentSchema || { type: 'string' })}
		</div>

		<!-- SCENARIO E: Null/undefined or unknown structure -->
	{:else}
		<div class="p-4 text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'} italic">
			No data available
		</div>
	{/if}
</div>
