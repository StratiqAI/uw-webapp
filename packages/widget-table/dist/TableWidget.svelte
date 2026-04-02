<script lang="ts">
	import type { TableWidgetData, ColumnDef } from './schema.js';
	import { useReactiveValidatedTopic, getDashboardWidgetHost } from '@stratiqai/dashboard-widget-sdk';

	interface Props {
		data: TableWidgetData;
		widgetId?: string;
		topicOverride?: string;
		darkMode?: boolean;
	}

	let { data, widgetId = 'table-widget-default', topicOverride, darkMode = false }: Props = $props();

	const host = getDashboardWidgetHost();
	const topic = $derived(host.getWidgetTopic('table', widgetId, topicOverride));
	const dataStream = useReactiveValidatedTopic<TableWidgetData>(() => topic);
	let widgetData = $derived<TableWidgetData>(dataStream.current || data);

	let sortColumn = $state<string | null>(null);
	let sortDirection = $state<'asc' | 'desc'>('asc');
	let currentPage = $state(1);
	let searchQuery = $state('');

	// Priority: columns > headers > auto-detect from rows
	let resolvedColumns = $derived.by((): ColumnDef[] => {
		if (widgetData.columns && widgetData.columns.length > 0) {
			return widgetData.columns;
		}
		if (widgetData.headers && widgetData.headers.length > 0) {
			return widgetData.headers.map((h) => ({ key: h }));
		}
		const keySet = new Set<string>();
		for (const row of widgetData.rows) {
			for (const key of Object.keys(row)) {
				keySet.add(key);
			}
		}
		return Array.from(keySet).map((k) => ({ key: k }));
	});

	function getColumnLabel(col: ColumnDef): string {
		return col.label ?? col.key;
	}

	function getColumnAlign(col: ColumnDef): string {
		if (col.align) return col.align;
		if (col.type === 'number' || col.type === 'currency' || col.type === 'percent') return 'right';
		return 'left';
	}

	function formatCell(value: unknown, col: ColumnDef): string {
		if (value == null) return '';
		const colType = col.type ?? 'text';
		if (colType === 'number') {
			const num = Number(value);
			return isNaN(num) ? String(value) : num.toLocaleString();
		}
		if (colType === 'currency') {
			const num = Number(value);
			return isNaN(num) ? String(value) : `$${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
		}
		if (colType === 'percent') {
			const num = Number(value);
			return isNaN(num) ? String(value) : `${num.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
		}
		return String(value);
	}

	// Reset page when data or search changes
	$effect(() => {
		// Depend on the search query and row count to reset pagination
		void searchQuery;
		void widgetData.rows.length;
		currentPage = 1;
	});

	let filteredRows = $derived.by(() => {
		if (!widgetData.searchable || !searchQuery.trim()) return widgetData.rows;
		const q = searchQuery.toLowerCase();
		return widgetData.rows.filter((row) =>
			resolvedColumns.some((col) => {
				const val = row[col.key];
				return val != null && String(val).toLowerCase().includes(q);
			})
		);
	});

	let sortedRows = $derived.by(() => {
		if (!widgetData.sortable || !sortColumn) return filteredRows;
		const col = resolvedColumns.find((c) => c.key === sortColumn);
		const isNumeric = col?.type === 'number' || col?.type === 'currency' || col?.type === 'percent';

		return [...filteredRows].sort((a, b) => {
			const aVal = a[sortColumn!];
			const bVal = b[sortColumn!];

			let comparison: number;
			if (isNumeric) {
				comparison = (Number(aVal) || 0) - (Number(bVal) || 0);
			} else {
				comparison = String(aVal ?? '').localeCompare(String(bVal ?? ''));
			}
			return sortDirection === 'asc' ? comparison : -comparison;
		});
	});

	let pageSize = $derived(widgetData.pageSize ?? 10);
	let totalPages = $derived(Math.max(1, Math.ceil(sortedRows.length / pageSize)));

	let paginatedRows = $derived.by(() => {
		if (!widgetData.paginated) return sortedRows;
		const start = (currentPage - 1) * pageSize;
		return sortedRows.slice(start, start + pageSize);
	});

	function handleSort(key: string) {
		if (!widgetData.sortable) return;
		if (sortColumn === key) {
			sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
		} else {
			sortColumn = key;
			sortDirection = 'asc';
		}
	}

	const alignClass: Record<string, string> = {
		left: 'text-left',
		center: 'text-center',
		right: 'text-right'
	};
</script>

<div class="table-widget flex h-full flex-col overflow-hidden">
	{#if widgetData.searchable}
		<div class="flex items-center gap-2 border-b px-3 py-1.5 {darkMode ? 'border-slate-700' : 'border-slate-200'}">
			<svg class="h-3.5 w-3.5 shrink-0 {darkMode ? 'text-slate-500' : 'text-slate-400'}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
				<path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
			</svg>
			<input
				type="text"
				placeholder="Search..."
				bind:value={searchQuery}
				class="w-full border-none bg-transparent text-xs outline-none placeholder:opacity-50 {darkMode ? 'text-slate-200 placeholder:text-slate-500' : 'text-slate-700 placeholder:text-slate-400'}"
			/>
			{#if searchQuery}
				<button
					onclick={() => (searchQuery = '')}
					class="shrink-0 text-xs {darkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'}"
				>
					Clear
				</button>
			{/if}
		</div>
	{/if}

	<div class="flex-1 overflow-auto">
		{#if resolvedColumns.length === 0 || widgetData.rows.length === 0}
			<div class="flex h-full items-center justify-center p-6">
				<p class="text-sm {darkMode ? 'text-slate-500' : 'text-slate-400'}">
					{widgetData.rows.length === 0 ? 'No data available' : 'No columns defined'}
				</p>
			</div>
		{:else}
			<table class="w-full text-sm">
				<thead class="sticky top-0 {darkMode ? 'bg-slate-800' : 'bg-slate-50'}">
					<tr>
						{#each resolvedColumns as col}
							{@const align = getColumnAlign(col)}
							<th
								class="whitespace-nowrap px-3 py-2 font-medium {alignClass[align]} {darkMode ? 'text-slate-200' : 'text-slate-700'} {widgetData.sortable ? (darkMode ? 'cursor-pointer select-none hover:bg-slate-700' : 'cursor-pointer select-none hover:bg-slate-100') : ''}"
								style={col.width ? `width: ${col.width}` : ''}
								onclick={() => handleSort(col.key)}
							>
								{getColumnLabel(col)}
								{#if widgetData.sortable && sortColumn === col.key}
									<span class="ml-1 opacity-70">{sortDirection === 'asc' ? '\u2191' : '\u2193'}</span>
								{/if}
							</th>
						{/each}
					</tr>
				</thead>
				<tbody class="divide-y {darkMode ? 'divide-slate-700' : 'divide-slate-200'}">
					{#each paginatedRows as row}
						<tr class="transition-colors {darkMode ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'}">
							{#each resolvedColumns as col}
								{@const align = getColumnAlign(col)}
								<td class="px-3 py-2 {alignClass[align]} {darkMode ? 'text-slate-300' : 'text-slate-600'}">
									{formatCell(row[col.key], col)}
								</td>
							{/each}
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</div>

	{#if widgetData.paginated && sortedRows.length > pageSize}
		<div class="flex items-center justify-between border-t px-3 py-1.5 {darkMode ? 'border-slate-700' : 'border-slate-200'}">
			<span class="text-xs tabular-nums {darkMode ? 'text-slate-400' : 'text-slate-500'}">
				{sortedRows.length} row{sortedRows.length === 1 ? '' : 's'}
				{#if searchQuery}&middot; filtered{/if}
			</span>
			<div class="flex items-center gap-2">
				<button
					class="rounded px-2 py-0.5 text-xs disabled:opacity-40 {darkMode ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-600 hover:bg-slate-100'}"
					disabled={currentPage <= 1}
					onclick={() => currentPage--}
				>
					Prev
				</button>
				<span class="text-xs tabular-nums {darkMode ? 'text-slate-400' : 'text-slate-500'}">
					{currentPage} / {totalPages}
				</span>
				<button
					class="rounded px-2 py-0.5 text-xs disabled:opacity-40 {darkMode ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-600 hover:bg-slate-100'}"
					disabled={currentPage >= totalPages}
					onclick={() => currentPage++}
				>
					Next
				</button>
			</div>
		</div>
	{/if}
</div>
