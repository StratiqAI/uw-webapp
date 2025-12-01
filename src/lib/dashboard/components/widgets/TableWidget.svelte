<script lang="ts">
	import type { TableWidget } from '$lib/dashboard/types/widget';
	import { mapStore } from '$lib/stores/MapStore';
	import { useTopic } from '$lib/hooks/mapStoreRunes.svelte';
	import { getWidgetTopic, getWidgetSchemaId } from '$lib/dashboard/setup/widgetSchemaRegistration';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';

	interface Props {
		data: TableWidget['data'];
		widgetId?: string;
		darkMode?: boolean;
	}

	let { data, widgetId = 'table-widget-default', darkMode = false }: Props = $props();
	
	// Use topic naming convention: widget:table:${widgetId}
	const topic = $derived(getWidgetTopic('table', widgetId));
	
	// Subscribe to data updates using useTopic hook
	const dataStream = useTopic(topic, `table-widget-consumer-${widgetId}`);
	let widgetData = $derived(dataStream.current || data);

	// Enforce schema on mount
	onMount(() => {
		if (browser) {
			const schemaId = getWidgetSchemaId('table');
			mapStore.enforceTopicSchema(topic, schemaId);
			console.log(`📋 TableWidget:${widgetId} - Schema enforced: ${schemaId} on topic: ${topic}`);
		}
	});

	console.log(`📋 TableWidget:${widgetId} - Initialized`);
	console.log(`   Topic: ${topic}`);
	console.log(`   Initial data:`, data);

	let sortColumn = $state<string | null>(null);
	let sortDirection = $state<'asc' | 'desc'>('asc');
	let currentPage = $state(1);
	const itemsPerPage = 10;

	let sortedRows = $derived.by(() => {
		if (!widgetData.sortable || !sortColumn) return widgetData.rows;

		return [...widgetData.rows].sort((a, b) => {
			const aVal = a[sortColumn!];
			const bVal = b[sortColumn!];
			const comparison = aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
			return sortDirection === 'asc' ? comparison : -comparison;
		});
	});

	let paginatedRows = $derived.by(() => {
		if (!widgetData.paginated) return sortedRows;
		const start = (currentPage - 1) * itemsPerPage;
		return sortedRows.slice(start, start + itemsPerPage);
	});

	function handleSort(column: string) {
		if (!widgetData.sortable) return;
		if (sortColumn === column) {
			sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
		} else {
			sortColumn = column;
			sortDirection = 'asc';
		}
	}
</script>

<div class="table-widget flex h-full flex-col">
	<div class="flex-1 overflow-auto">
		{#if widgetData.title}
			<h3 class="mb-2 text-lg font-medium {darkMode ? 'text-slate-200' : 'text-slate-700'}">{widgetData.title}</h3>
		{/if}
		<table class="w-full text-sm">
			<thead class="sticky top-0 {darkMode ? 'bg-slate-800' : 'bg-slate-50'}">
				<tr>
					{#each widgetData.headers as header}
						<th
							class="px-3 py-2 text-left font-medium {darkMode ? 'text-slate-200' : 'text-slate-700'} {widgetData.sortable
								? darkMode ? 'cursor-pointer hover:bg-slate-700' : 'cursor-pointer hover:bg-slate-100'
								: ''}"
							onclick={() => handleSort(header)}
						>
							{header}
							{#if widgetData.sortable && sortColumn === header}
								<span class="ml-1">
									{sortDirection === 'asc' ? '↑' : '↓'}
								</span>
							{/if}
						</th>
					{/each}
				</tr>
			</thead>
			<tbody class="divide-y {darkMode ? 'divide-slate-700' : 'divide-slate-200'}">
				{#each paginatedRows as row}
					<tr class={darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-50'}>
						{#each widgetData.headers as header}
							<td class="px-3 py-2 {darkMode ? 'text-slate-300' : 'text-slate-600'}">
								{row[header] || ''}
							</td>
						{/each}
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	{#if widgetData.paginated}
		<div class="mt-2 flex items-center justify-between border-t {darkMode ? 'border-slate-700' : 'border-slate-200'} pt-2">
			<button
				class="rounded {darkMode ? 'bg-slate-700 text-slate-200 hover:bg-slate-600' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'} px-3 py-1 text-sm disabled:opacity-50"
				disabled={currentPage === 1}
				onclick={() => currentPage--}
			>
				Previous
			</button>
			<span class="text-sm {darkMode ? 'text-slate-300' : 'text-slate-600'}">
				Page {currentPage} of {Math.ceil(widgetData.rows.length / itemsPerPage)}
			</span>
			<button
				class="rounded {darkMode ? 'bg-slate-700 text-slate-200 hover:bg-slate-600' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'} px-3 py-1 text-sm disabled:opacity-50"
				disabled={currentPage >= Math.ceil(widgetData.rows.length / itemsPerPage)}
				onclick={() => currentPage++}
			>
				Next
			</button>
		</div>
	{/if}
</div>
