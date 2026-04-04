<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { ViewCategory } from './types';

	const {
		category,
		fullscreen = false,
		darkMode = false,
		count,
		excludedCount = 0,
		supportsExclusion = false,
		onToggleFullscreen,
		onClose,
		children
	}: {
		category: Exclude<ViewCategory, null>;
		fullscreen?: boolean;
		darkMode?: boolean;
		count: number;
		excludedCount?: number;
		supportsExclusion?: boolean;
		onToggleFullscreen: () => void;
		onClose: () => void;
		children: Snippet<[{ fullscreen: boolean }]>;
	} = $props();

	const title = $derived(
		category === 'documents'
			? 'Documents'
			: category === 'texts'
				? 'Text Blocks'
				: category === 'tables'
					? 'Tables'
					: 'Images'
	);

	const icon = $derived(
		category === 'documents'
			? '📁'
			: category === 'texts'
				? '📄'
				: category === 'tables'
					? '📊'
					: '🖼️'
	);

	const excludedSuffix = $derived(
		excludedCount > 0 ? `, ${excludedCount} excluded` : ''
	);
</script>

{#snippet exclusionBanner()}
	{#if supportsExclusion}
		<div class="mb-4 p-3 rounded-lg {darkMode ? 'bg-amber-900/20 border-amber-500/30' : 'bg-amber-50 border-amber-200'} border">
			<div class="flex items-start gap-2">
				<svg class="w-5 h-5 shrink-0 mt-0.5 {darkMode ? 'text-amber-400' : 'text-amber-600'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
				</svg>
				<div class="text-sm {darkMode ? 'text-amber-200' : 'text-amber-800'}">
					<span class="font-medium">Exclude from analysis:</span> Uncheck the checkbox next to any text block, table, or image to exclude it from the AI analysis. Excluded items will not be used when generating insights.
				</div>
			</div>
		</div>
	{/if}
{/snippet}

{#if !fullscreen}
	<!-- Inline Detail Panel -->
	<div class="border-t {darkMode ? 'border-slate-700' : 'border-slate-200'} pt-4 mt-4">
		<div class="flex items-center justify-between mb-4">
			<h4 class="text-base font-semibold {darkMode ? 'text-white' : 'text-slate-900'} flex items-center gap-2">
				<span>{icon}</span>
				<span>{title}</span>
				<span class="text-sm font-normal {darkMode ? 'text-slate-400' : 'text-slate-500'}">
					({count}{excludedSuffix})
				</span>
			</h4>
			<div class="flex items-center gap-1">
				<button
					type="button"
					onclick={onToggleFullscreen}
					class="p-1.5 rounded-md {darkMode ? 'hover:bg-slate-700 text-slate-400 hover:text-slate-200' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-700'} transition-colors"
					aria-label="Enter fullscreen"
					title="Expand to fullscreen"
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"></path>
					</svg>
				</button>
				<button
					type="button"
					onclick={onClose}
					class="p-1.5 rounded-md {darkMode ? 'hover:bg-slate-700 text-slate-400 hover:text-slate-200' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-700'} transition-colors"
					aria-label="Close panel"
					title="Close"
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
					</svg>
				</button>
			</div>
		</div>

		{@render exclusionBanner()}

		<div class="space-y-3 max-h-96 overflow-y-auto pr-2">
			{@render children({ fullscreen: false })}
		</div>
	</div>
{:else}
	<!-- Fullscreen Modal Overlay -->
	<div
		class="fixed inset-0 z-50 flex flex-col {darkMode ? 'bg-slate-900' : 'bg-white'}"
		role="dialog"
		aria-modal="true"
		aria-label="{title} fullscreen view"
	>
		<div class="shrink-0 flex items-center justify-between px-6 py-4 border-b {darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-slate-50'}">
			<h2 class="text-xl font-semibold {darkMode ? 'text-white' : 'text-slate-900'} flex items-center gap-3">
				<span class="text-2xl">{icon}</span>
				<span>{title}</span>
				<span class="text-base font-normal {darkMode ? 'text-slate-400' : 'text-slate-500'}">
					({count} items{excludedSuffix})
				</span>
			</h2>
			<div class="flex items-center gap-2">
				<button
					type="button"
					onclick={onToggleFullscreen}
					class="flex items-center gap-2 px-3 py-1.5 rounded-md {darkMode ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'} transition-colors text-sm font-medium"
					aria-label="Exit fullscreen"
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25"></path>
					</svg>
					<span>Exit Fullscreen</span>
				</button>
				<button
					type="button"
					onclick={onClose}
					class="p-2 rounded-md {darkMode ? 'hover:bg-slate-700 text-slate-400 hover:text-slate-200' : 'hover:bg-slate-200 text-slate-500 hover:text-slate-700'} transition-colors"
					aria-label="Close"
				>
					<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
					</svg>
				</button>
			</div>
		</div>

		<div class="shrink-0 px-6 pt-4">
			{@render exclusionBanner()}
		</div>

		<div class="flex-1 overflow-hidden p-6 pt-2">
			<div class="space-y-3 h-full overflow-y-auto pr-2">
				{@render children({ fullscreen: true })}
			</div>
		</div>

		<div class="shrink-0 px-6 py-2 text-center text-xs {darkMode ? 'text-slate-500 bg-slate-800 border-t border-slate-700' : 'text-slate-400 bg-slate-50 border-t border-slate-200'}">
			Press <kbd class="px-1.5 py-0.5 rounded {darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-600'} font-mono text-xs">Esc</kbd> to exit fullscreen
		</div>
	</div>
{/if}
