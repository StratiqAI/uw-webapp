<script lang="ts">
	import type { ProjectDocument } from './types';

	const {
		documents,
		fullscreen = false,
		darkMode = false
	}: {
		documents: ProjectDocument[];
		fullscreen?: boolean;
		darkMode?: boolean;
	} = $props();
</script>

{#if documents.length === 0}
	<div class="text-center py-8 {darkMode ? 'text-slate-400' : 'text-slate-500'}">
		<p class="text-sm">No documents uploaded yet.</p>
	</div>
{:else}
	<div class="{fullscreen ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-3'}">
		{#each documents as doc (doc.id)}
			<div class="p-4 {darkMode ? 'bg-slate-700/50 border-slate-600 hover:bg-slate-700' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'} rounded-lg border transition-colors">
				<div class="flex items-center gap-3">
					<div class="shrink-0 w-12 h-12 flex items-center justify-center {darkMode ? 'bg-slate-600' : 'bg-slate-200'} rounded-lg">
						<svg class="w-6 h-6 {darkMode ? 'text-slate-300' : 'text-slate-600'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
						</svg>
					</div>
					<div class="flex-1 min-w-0">
						<div class="font-medium {darkMode ? 'text-white' : 'text-slate-900'} truncate {fullscreen ? 'text-base' : ''}">
							{doc.filename}
						</div>
						<div class="text-xs {darkMode ? 'text-slate-400' : 'text-slate-500'} mt-0.5 font-mono truncate">
							ID: {doc.id.substring(0, fullscreen ? 24 : 16)}...
						</div>
					</div>
				</div>
			</div>
		{/each}
	</div>
{/if}
