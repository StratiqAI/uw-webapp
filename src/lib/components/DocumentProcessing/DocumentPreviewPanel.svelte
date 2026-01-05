<!-- src/lib/components/DocumentProcessing/DocumentPreviewPanel.svelte -->
<script lang="ts">
	import PageThumbnailGrid from './PageThumbnailGrid.svelte';
	import PageViewer from './PageViewer.svelte';
	import type { DocumentProcessingState } from './types';

	const { store } = $props<{
		store: ReturnType<typeof import('./processing.store.svelte').createProcessingStore>;
	}>();

	const selectedPage = $derived(store.state.selectedPage);
	const selectedPageData = $derived(store.getPage(selectedPage));
</script>

<div class="flex h-full flex-col">
	<!-- Page Viewer -->
	<div class="flex-1 overflow-auto bg-gray-50 p-4 dark:bg-gray-900">
		<PageViewer pageNumber={selectedPage} pageData={selectedPageData} />
	</div>

	<!-- Page Thumbnail Grid -->
	<div class="border-t border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
		<PageThumbnailGrid
			pages={store.state.pages}
			selectedPage={selectedPage}
			onPageSelect={(pageNum) => store.setSelectedPage(pageNum)}
		/>
	</div>
</div>
