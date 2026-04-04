<!-- src/lib/components/DocumentProcessing/PageThumbnailGrid.svelte -->
<script lang="ts">
	import PageThumbnail from './PageThumbnail.svelte';
	import type { PageState } from './types';

	const { pages, selectedPage, onPageSelect } = $props<{
		pages: PageState[];
		selectedPage: number;
		onPageSelect: (pageNumber: number) => void;
	}>();

	const sortedPages = $derived([...pages].sort((a, b) => a.pageNumber - b.pageNumber));
</script>

<div class="space-y-2">
	<div class="mb-2 text-xs font-medium text-gray-600 dark:text-gray-400">
		Pages ({pages.length})
	</div>
	<div class="grid grid-cols-5 gap-2">
		{#each sortedPages as page (page.pageNumber)}
			<PageThumbnail
				{page}
				isSelected={page.pageNumber === selectedPage}
				onClick={() => onPageSelect(page.pageNumber)}
			/>
		{/each}
	</div>
</div>
