<script lang="ts">
	import type { Table, ExtractedTable } from './types';
	import { addTableToDashboard, addExtractedTableToDashboard } from './addToDashboard';
	import SendToDashboardButton from './SendToDashboardButton.svelte';

	const {
		tables,
		extractedTables,
		excludedIds,
		projectId,
		fullscreen = false,
		darkMode = false,
		onToggleExclusion
	}: {
		tables: Table[];
		extractedTables: ExtractedTable[];
		excludedIds: Set<string>;
		projectId: string;
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
			<div class="p-4 {darkMode ? 'bg-green-900/20 border-green-500/30 hover:bg-green-900/30' : 'bg-green-50 border-green-200 hover:bg-green-100'} rounded-lg border transition-colors">
				<div class="flex items-start gap-3">
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
						</div>
						<div class="{darkMode ? 'text-slate-300' : 'text-slate-700'} text-sm {fullscreen ? 'max-h-48 overflow-y-auto' : ''}">
							{table.description || 'No description available'}
						</div>
						<div class="mt-2">
							<SendToDashboardButton
								{darkMode}
								colorClasses={darkMode ? 'text-green-400 hover:text-green-300' : 'text-green-600 hover:text-green-700'}
								onSend={(tabId) => addTableToDashboard(table, projectId, tabId)}
							/>
						</div>
					</div>
				</div>
			</div>
		{/each}

		{#each extractedTables as extractedTable (extractedTable.id)}
			<div class="p-4 {darkMode ? 'bg-green-900/20 border-green-500/30 hover:bg-green-900/30' : 'bg-green-50 border-green-200 hover:bg-green-100'} rounded-lg border transition-colors">
				<div class="flex items-start gap-3">
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
						</div>
						{@render renderedTable(extractedTable.headers, extractedTable.rows)}
						<div class="mt-2">
							<SendToDashboardButton
								{darkMode}
								colorClasses={darkMode ? 'text-green-400 hover:text-green-300' : 'text-green-600 hover:text-green-700'}
								onSend={(tabId) => addExtractedTableToDashboard(extractedTable, projectId, tabId)}
							/>
						</div>
					</div>
				</div>
			</div>
		{/each}
	</div>
{/if}
