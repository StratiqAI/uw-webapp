<!-- src/lib/components/DocumentProcessing/PageThumbnail.svelte -->
<script lang="ts">
	import ProcessingBadge from './ProcessingBadge.svelte';
	import type { PageState } from './types';

	const { page, isSelected, onClick } = $props<{
		page: PageState;
		isSelected: boolean;
		onClick: () => void;
	}>();

	const itemCount = $derived(page.textBlocks.length + page.tables.length + page.images.length);
</script>

<button
	type="button"
	class="group relative flex aspect-[3/4] flex-col items-center justify-center overflow-hidden rounded border-2 transition-all {isSelected
		? 'border-indigo-500 bg-indigo-50 dark:border-indigo-400 dark:bg-indigo-900/20'
		: 'border-gray-200 bg-gray-100 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600'}"
	onclick={onClick}
	aria-label="Page {page.pageNumber}"
>
	<!-- Page Number -->
	<div class="absolute inset-0 flex items-center justify-center">
		<span class="text-lg font-semibold text-gray-600 dark:text-gray-400">{page.pageNumber}</span>
	</div>

	<!-- Status Badge -->
	<div class="absolute top-1 right-1">
		<ProcessingBadge status={page.status} />
	</div>

	<!-- Item Count Badge -->
	{#if itemCount > 0}
		<div
			class="absolute bottom-1 left-1 rounded-full bg-indigo-600 px-2 py-0.5 text-xs font-medium text-white"
		>
			{itemCount} items
		</div>
	{/if}

	<!-- Hover Overlay -->
	<div
		class="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/5 dark:group-hover:bg-white/5"
	></div>
</button>
