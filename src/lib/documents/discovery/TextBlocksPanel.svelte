<script lang="ts">
	import type { Text } from './types';
	import { containsMarkdownTable } from './markdownTableParser';

	const {
		texts,
		excludedIds,
		fullscreen = false,
		darkMode = false,
		onToggleExclusion
	}: {
		texts: Text[];
		excludedIds: Set<string>;
		fullscreen?: boolean;
		darkMode?: boolean;
		onToggleExclusion: (id: string) => void;
	} = $props();
</script>

{#if texts.length === 0}
	<div class="text-center py-8 {darkMode ? 'text-slate-400' : 'text-slate-500'}">
		<p class="text-sm">No text blocks discovered yet.</p>
	</div>
{:else}
	<div class="{fullscreen ? 'grid grid-cols-1 lg:grid-cols-2 gap-4' : 'space-y-3'}">
		{#each texts as text (text.id)}
			{@const isExcluded = excludedIds.has(text.id)}
			{@const hasTable = containsMarkdownTable(text.text || '')}
			<div class="p-4 {darkMode ? 'bg-blue-900/20 border-blue-500/30 hover:bg-blue-900/30' : 'bg-blue-50 border-blue-200 hover:bg-blue-100'} rounded-lg border transition-colors {isExcluded ? 'opacity-50' : ''}">
				<div class="flex items-start gap-3">
					<label class="shrink-0 flex items-center justify-center cursor-pointer mt-1">
						<input
							type="checkbox"
							checked={!isExcluded}
							onchange={() => onToggleExclusion(text.id)}
							class="w-5 h-5 rounded border-2 {darkMode ? 'bg-slate-700 border-slate-500 checked:bg-blue-500 checked:border-blue-500' : 'bg-white border-slate-300 checked:bg-blue-600 checked:border-blue-600'} cursor-pointer"
						/>
					</label>
					<div class="shrink-0 w-10 h-10 flex items-center justify-center {darkMode ? 'bg-blue-800/50' : 'bg-blue-100'} rounded-lg">
						<span class="text-lg">📄</span>
					</div>
					<div class="flex-1 min-w-0">
						<div class="flex items-center gap-2 mb-1 flex-wrap">
							<span class="font-medium {darkMode ? 'text-blue-300' : 'text-blue-700'}">
								Page {text.pageNum || 'N/A'}
							</span>
							<span class="text-xs {darkMode ? 'text-slate-500' : 'text-slate-400'}">•</span>
							<span class="text-xs {darkMode ? 'text-slate-400' : 'text-slate-500'} font-mono">
								{text.id.substring(0, 12)}...
							</span>
							{#if hasTable}
								<span class="text-xs px-1.5 py-0.5 rounded {darkMode ? 'bg-green-900/50 text-green-300' : 'bg-green-100 text-green-700'}">Contains table</span>
							{/if}
							{#if isExcluded}
								<span class="text-xs px-1.5 py-0.5 rounded {darkMode ? 'bg-red-900/50 text-red-300' : 'bg-red-100 text-red-700'}">Excluded</span>
							{/if}
						</div>
						<div class="{darkMode ? 'text-slate-300' : 'text-slate-700'} text-sm leading-relaxed {fullscreen ? 'max-h-48 overflow-y-auto' : ''} whitespace-pre-wrap">
							{text.text || 'No text content'}
						</div>
					</div>
				</div>
			</div>
		{/each}
	</div>
{/if}
