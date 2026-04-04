<!-- src/lib/components/DocumentProcessing/HighlightOverlay.svelte -->
<script lang="ts">
	import type { PageState } from './types';

	const { pageData } = $props<{
		pageData: PageState;
	}>();

	// In production, this would overlay highlights on the actual page render
	// For now, we'll show a visual representation
</script>

<!-- This component will overlay highlights on the page preview -->
<!-- For now, it's a placeholder that will be enhanced when PDF rendering is added -->
<div class="absolute inset-0 pointer-events-none">
	<!-- Text block highlights (blue) -->
	{#each pageData.textBlocks as textBlock}
		<div
			class="absolute rounded border-2 border-blue-500 bg-blue-500/20"
			style="left: {Math.random() * 60}%; top: {Math.random() * 60}%; width: {20 + Math.random() * 20}%; height: {5 + Math.random() * 10}%"
			title="Text block"
		></div>
	{/each}

	<!-- Table highlights (green) -->
	{#each pageData.tables as table}
		<div
			class="absolute rounded border-2 border-green-500 bg-green-500/20"
			style="left: {Math.random() * 50}%; top: {Math.random() * 50}%; width: {25 + Math.random() * 25}%; height: {15 + Math.random() * 20}%"
			title="Table"
		></div>
	{/each}

	<!-- Image highlights (orange) -->
	{#each pageData.images as image}
		<div
			class="absolute rounded border-2 border-orange-500 bg-orange-500/20"
			style="left: {image.topLeftX || Math.random() * 50}%; top: {image.topLeftY || Math.random() * 50}%; width: {((image.bottomRightX || 100) - (image.topLeftX || 0))}%; height: {((image.bottomRightY || 100) - (image.topLeftY || 0))}%"
			title="Image: {image.imageId}"
		></div>
	{/each}
</div>
