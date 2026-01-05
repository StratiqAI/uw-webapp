<!-- src/lib/components/DocumentProcessing/PageViewer.svelte -->
<script lang="ts">
	import HighlightOverlay from './HighlightOverlay.svelte';
	import type { PageState } from './types';

	const { pageNumber, pageData } = $props<{
		pageNumber: number;
		pageData: PageState | undefined;
	}>();

	// Placeholder for PDF/image renderer
	// In production, this would use PDF.js or similar
	const hasContent = $derived(pageData && (pageData.textBlocks.length > 0 || pageData.tables.length > 0 || pageData.images.length > 0));
</script>

<div class="relative h-full w-full">
	{#if pageData}
		<!-- Page Preview Placeholder -->
		<div
			class="mx-auto flex h-full max-w-2xl items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800"
		>
			<div class="text-center">
				<div class="mb-4 text-6xl">📄</div>
				<div class="text-lg font-medium text-gray-700 dark:text-gray-300">Page {pageNumber}</div>
				<div class="mt-2 text-sm text-gray-500 dark:text-gray-400">
					{#if hasContent}
						{pageData.textBlocks.length} text blocks, {pageData.tables.length} tables, {pageData.images.length} images
					{:else}
						No content discovered yet
					{/if}
				</div>
			</div>
		</div>

		<!-- Highlight Overlay -->
		{#if hasContent}
			<HighlightOverlay {pageData} />
		{/if}
	{:else}
		<div class="flex h-full items-center justify-center text-gray-400 dark:text-gray-600">
			Page {pageNumber} not loaded
		</div>
	{/if}
</div>
