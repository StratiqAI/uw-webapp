<script lang="ts">
	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	// Import Types and Data Stores
	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	import type { Project } from '$lib/types/Project';
	import type { Document } from '$lib/types/Document';	
	
	// The project store holds the state for the workspace. 
	// It's initialized from data loaded on the server side and passed to the client.
	import { project as projectStore, documents as documentsStore } from '$lib/stores/appStateStore';
	
	// Access mapStore from parent layout context
	import { getContext } from 'svelte';
	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	// Import Application Defined Components
	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	import PDFViewer from '$lib/components/PDFViewer/PDFViewer.svelte';
	import InsightTable from '$lib/components/workspace/InsightTable.svelte';

	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	// Import Svelte Components
	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	import { AccordionItem, Accordion } from 'flowbite-svelte';
	import { Button, Dropdown, DropdownItem } from 'flowbite-svelte';
	import { ChevronDownOutline } from 'flowbite-svelte-icons';

	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	// Initialize the state variables for this component
	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	let currentPage: number = $state(1);
	
	// Get mapStore from parent layout context
	const mapStore = getContext('mapStore') as any;

	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	// Component Variables that are Derived from the Stores
	// Do not modify these variables directly
	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-

	// Projects belong to users and hold the documents
	let project: Project = $derived($projectStore)!;

	// Documents belong to projects and hold the pages and insights
	let documents: Document[] = $derived($documentsStore);

	// Documents belong to projects and hold the pages and insights
	let currentDocHash: string | null = $derived(project?.documents?.[0]?.id ?? null);
	let currentDocument: Document | null = $derived(
		documents?.find((doc) => doc.docHash === currentDocHash) ?? null
	);

	// Example: Subscribe to specific keys in mapStore
	// You can use mapStore.subscribeToKey('keyName') to get a reactive store for a specific key
	// Example usage in template: {#each $mapStore.subscribeToKey('documentsLayout') as item}
</script>

{#if currentDocHash}
	<PDFViewer
		scale={1.0}
		bind:currentPage={currentPage}
		bind:currentDocHash={currentDocHash}
		documents={project?.documents}
	/>
	<div class="md:col-span-1 lg:col-span-2 xl:col-span-3 md:mt-0 space-y-4">
		{#if currentDocument?.insights?.items}
			{#if currentDocument.insights.items.length === 0}
				<div class="text-gray-400">No insights found for this page.</div>
			{:else}
				<InsightTable
					insights={currentDocument.insights.items.filter(
						(i) => Number(i.pageId) + 1 === Number(currentPage)
					)}
				/>
			{/if}
		{:else}
			<div class="text-gray-400">No insights found for this page.</div>
		{/if}

		{#if currentDocument?.texts?.items}
			{#each currentDocument.texts.items.filter((t) => t.pageNumber + 1 === currentPage) as text}
				<Accordion>
					<AccordionItem>
						{#snippet header()}Show Raw Text{/snippet}
						<p class="text-gray-500 dark:text-gray-400">
							{currentPage + 1}: {text.content}
						</p>
					</AccordionItem>
				</Accordion>
			{/each}
		{:else}
			<div class="text-gray-400">No text found for this page.</div>
		{/if}
	</div>
{:else}
	<p class="text-sm text-gray-500 dark:text-gray-400 mt-8">
		Add a document to the project to view the document analysis data.
	</p>
{/if}
