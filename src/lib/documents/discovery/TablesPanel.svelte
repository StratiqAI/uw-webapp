<script lang="ts">
	import type { Table, ExtractedTable } from './types';

	const {
		tables,
		extractedTables,
		excludedIds,
		fullscreen = false,
		darkMode = false,
		onToggleExclusion
	}: {
		tables: Table[];
		extractedTables: ExtractedTable[];
		excludedIds: Set<string>;
		fullscreen?: boolean;
		darkMode?: boolean;
		onToggleExclusion: (id: string) => void;
	} = $props();
</script>

{#snippet renderedTable(headers: string[], rows: string[][])}
	<div class="overflow-x-auto {fullscreen ? 'max-h-64' : 'max-h-48'} overflow-y-auto">
		<table class="min-w-full text-sm {darkMode ? 'text-slate-300' : 'text-slate-700'}">
			<thead class="sticky top-0 {darkMode ? 'bg-green-900/50' : 'bg-green-100'}">
				<tr>
					{#each headers as header}
						<th class="px-3 py-2 text-left font-semibold {darkMode ? 'text-green-300 border-green-700' : 'text-green-800 border-green-200'} border-b whitespace-nowrap">
							{header}
						</th>
					{/each}
				</tr>
			</thead>
			<tbody>
				{#each rows as row, rowIndex}
					<tr class="{rowIndex % 2 === 0 ? (darkMode ? 'bg-slate-800/30' : 'bg-white') : (darkMode ? 'bg-slate-800/50' : 'bg-green-50/50')}">
						{#each row as cell, cellIndex}
							<td class="px-3 py-2 {darkMode ? 'border-slate-700' : 'border-slate-200'} border-b {cellIndex === 0 ? 'font-medium' : ''}">
								{cell}
							</td>
						{/each}
						{#each Array(Math.max(0, headers.length - row.length)) as _}
							<td class="px-3 py-2 {darkMode ? 'border-slate-700' : 'border-slate-200'} border-b">-</td>
						{/each}
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/snippet}

{#if tables.length === 0 && extractedTables.length === 0}
	<div class="text-center py-8 {darkMode ? 'text-slate-400' : 'text-slate-500'}">
		<p class="text-sm">No tables discovered yet.</p>
	</div>
{:else}
	<div class="{fullscreen ? 'grid grid-cols-1 gap-4' : 'space-y-3'}">
		{#each tables as table (table.id)}
			{@const isExcluded = excludedIds.has(table.id)}
			<div class="p-4 {darkMode ? 'bg-green-900/20 border-green-500/30 hover:bg-green-900/30' : 'bg-green-50 border-green-200 hover:bg-green-100'} rounded-lg border transition-colors {isExcluded ? 'opacity-50' : ''}">
				<div class="flex items-start gap-3">
					<label class="shrink-0 flex items-center justify-center cursor-pointer mt-1">
						<input
							type="checkbox"
							checked={!isExcluded}
							onchange={() => onToggleExclusion(table.id)}
							class="w-5 h-5 rounded border-2 {darkMode ? 'bg-slate-700 border-slate-500 checked:bg-green-500 checked:border-green-500' : 'bg-white border-slate-300 checked:bg-green-600 checked:border-green-600'} cursor-pointer"
						/>
					</label>
					<div class="shrink-0 w-10 h-10 flex items-center justify-center {darkMode ? 'bg-green-800/50' : 'bg-green-100'} rounded-lg">
						<span class="text-lg">📊</span>
					</div>
					<div class="flex-1 min-w-0">
						<div class="flex items-center gap-2 mb-1">
							<span class="font-medium {darkMode ? 'text-green-300' : 'text-green-700'}">
								Page {table.pageNum || 'N/A'}
							</span>
							<span class="text-xs {darkMode ? 'text-slate-500' : 'text-slate-400'}">•</span>
							<span class="text-xs {darkMode ? 'text-slate-400' : 'text-slate-500'} font-mono">
								{table.id.substring(0, 12)}...
							</span>
							{#if isExcluded}
								<span class="text-xs px-1.5 py-0.5 rounded {darkMode ? 'bg-red-900/50 text-red-300' : 'bg-red-100 text-red-700'}">Excluded</span>
							{/if}
						</div>
						<div class="{darkMode ? 'text-slate-300' : 'text-slate-700'} text-sm {fullscreen ? 'max-h-48 overflow-y-auto' : ''}">
							{table.description || 'No description available'}
						</div>
					</div>
				</div>
			</div>
		{/each}

		{#each extractedTables as extractedTable (extractedTable.id)}
			{@const isExcluded = excludedIds.has(extractedTable.id)}
			<div class="p-4 {darkMode ? 'bg-green-900/20 border-green-500/30 hover:bg-green-900/30' : 'bg-green-50 border-green-200 hover:bg-green-100'} rounded-lg border transition-colors {isExcluded ? 'opacity-50' : ''}">
				<div class="flex items-start gap-3">
					<label class="shrink-0 flex items-center justify-center cursor-pointer mt-1">
						<input
							type="checkbox"
							checked={!isExcluded}
							onchange={() => onToggleExclusion(extractedTable.id)}
							class="w-5 h-5 rounded border-2 {darkMode ? 'bg-slate-700 border-slate-500 checked:bg-green-500 checked:border-green-500' : 'bg-white border-slate-300 checked:bg-green-600 checked:border-green-600'} cursor-pointer"
						/>
					</label>
					<div class="shrink-0 w-10 h-10 flex items-center justify-center {darkMode ? 'bg-green-800/50' : 'bg-green-100'} rounded-lg">
						<span class="text-lg">📊</span>
					</div>
					<div class="flex-1 min-w-0">
						<div class="flex items-center gap-2 mb-2 flex-wrap">
							<span class="font-medium {darkMode ? 'text-green-300' : 'text-green-700'}">
								Page {extractedTable.pageNum || 'N/A'}
							</span>
							<span class="text-xs {darkMode ? 'text-slate-500' : 'text-slate-400'}">•</span>
							<span class="text-xs px-1.5 py-0.5 rounded {darkMode ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-700'}">Extracted from text</span>
							<span class="text-xs {darkMode ? 'text-slate-400' : 'text-slate-500'}">
								{extractedTable.headers.length} columns, {extractedTable.rows.length} rows
							</span>
							{#if isExcluded}
								<span class="text-xs px-1.5 py-0.5 rounded {darkMode ? 'bg-red-900/50 text-red-300' : 'bg-red-100 text-red-700'}">Excluded</span>
							{/if}
						</div>
						{@render renderedTable(extractedTable.headers, extractedTable.rows)}
					</div>
				</div>
			</div>
		{/each}
	</div>
{/if}
