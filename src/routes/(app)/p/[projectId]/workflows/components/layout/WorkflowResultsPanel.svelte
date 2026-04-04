<script lang="ts">
	import type { WorkflowResult } from '../../types';

	const {
		results = [],
		darkMode = false,
		onClear
	}: {
		results?: WorkflowResult[];
		darkMode?: boolean;
		onClear?: () => void;
	} = $props();
</script>

{#if results.length > 0}
	<div class="h-64 {darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border-t overflow-y-auto shadow-lg">
		<div class="p-5">
			<div class="flex items-center justify-between mb-4">
				<h3 class="text-base font-semibold {darkMode ? 'text-white' : 'text-slate-900'} flex items-center gap-2">
					<svg class="w-5 h-5 {darkMode ? 'text-slate-400' : 'text-slate-600'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
					</svg>
					Execution Results
				</h3>
				{#if onClear}
					<button
						class="text-xs {darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'} font-medium"
						onclick={onClear}
					>
						Clear
					</button>
				{/if}
			</div>
			<div class="space-y-3">
				{#each results as result}
					<div class="{darkMode ? 'bg-slate-700 border-slate-600 hover:bg-slate-700' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'} border rounded-lg p-4 transition-colors">
						<div class="text-sm font-semibold {darkMode ? 'text-slate-200' : 'text-slate-700'} mb-2">{result.label}</div>
						<div class="{darkMode ? 'text-slate-300 bg-slate-800 border-slate-600' : 'text-slate-600 bg-white border-slate-200'} font-mono text-xs break-all rounded p-2 border">
							{JSON.stringify(result.value, null, 2)}
						</div>
					</div>
				{/each}
			</div>
		</div>
	</div>
{/if}
