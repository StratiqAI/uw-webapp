<script lang="ts">
	import { browser } from '$app/environment';
	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	// Import Types and Data Stores
	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-

	// PageProps is a type that is used to hold the data for the page.
	import type { PageProps } from './$types';

	// Project Data is loaded in the +layout.svelte file and passed to this component as well
	// as the other pages that are nested within the workspace layout
	import type { Project } from '$lib/types/cloud/app';

	// DocumentandPages is a type that is used to hold the data for the document and pages.
	import type { Document } from '$lib/types/Document';

	// The project store holds the state for the workspace. It's initialized from data loaded
	// on the server side and passed to the client.
	import { project as projectStore, documents as documentsStore } from '$lib/stores/appStateStore';

	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	// Props, Stores, and State Variables
	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	// let { data }: PageProps = $props();

	// Projects belong to users and hold the documents
	let project: Project = $derived($projectStore)!;

	// Documents belong to projects and hold the pages and insights
	let documents: Document[] = $derived($documentsStore);
	$inspect('documents: ', documents);

	let currentDocHash: string | null = $derived(documents?.[0]?.docHash ?? null);
	$inspect('currentDocHash: ', currentDocHash);
	let currentDocument: Document | null = $derived(
		documents?.find((doc) => doc.docHash === currentDocHash) ?? null
	);
	$inspect('currentDocument: ', currentDocument);

	// let dropdownOpen = $state(false);

	// Initialize currentDocHash when documents are loaded
	$effect(() => {
		if (documents && documents.length > 0 && !currentDocHash) {
			currentDocHash = documents[0].docHash;
		}
	});

	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
	// Import Application Utility Functions
	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
	import { getPageS3Url } from '$lib/utils/s3urls';

	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
	// Import 3rd Party Svelte Components
	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=

	// PdfViewer is a component that is used to display the PDF document.
	// import PdfViewer from 'svelte-pdf';
	import PDFViewer from '$lib/components/PDFViewer/PDFViewer.svelte';

	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
	// GraphQL Queries
	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
	import { Q_DOCUMENT_BY_ID } from '$lib/realtime/graphql/queries/Document';

	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
	// Import Svelte Component
	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
	import { Button, Dropdown, DropdownItem } from 'flowbite-svelte';
	import { ChevronDownOutline } from 'flowbite-svelte-icons';
	import { AccordionItem, Accordion } from 'flowbite-svelte';
	import InsightTable from '$lib/components/workspace/InsightTable.svelte';
</script>

<!-- <Button
	onclick={() => {
		console.log(project);
	}}
>
	Dump Project to Console
</Button>

<Button
	onclick={() => {
		console.log(documents);
	}}
>
	Dump Documents to Console
</Button> -->

<Button>
	{#if currentDocument}
		{project?.documents?.find(doc => doc.id === currentDocument.docHash)?.filename || 'Unknown Document'}<ChevronDownOutline class="ms-2 h-6 w-6 text-white dark:text-white" />
	{:else}
		Choose Document<ChevronDownOutline class="ms-2 h-6 w-6 text-white dark:text-white" />
	{/if}
</Button>
<Dropdown simple class="w-48 space-y-1 p-3 text-sm">
	{#each project?.documents as doc}
		<DropdownItem
			class="rounded-sm p-2 hover:bg-gray-100 dark:hover:bg-gray-600 {currentDocHash === doc.id
				? 'bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-100'
				: ''}"
			onclick={() => {
				currentDocHash = doc.id;
			}}
		>
			{doc.filename}
		</DropdownItem>
	{/each}
</Dropdown>

{#if currentDocument}
	<div class="my-4 space-y-8">
		{#if currentDocument?.pages?.items}
			{#each currentDocument.pages.items as page}
				<div class="grid gap-4 items-start grid-cols-1 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-8">
					<div class="md:col-span-2 lg:col-span-3 xl:col-span-5">
						<h3>Page {page.pageNumber}</h3>
						{#key currentDocument?.docHash}
							<div style="overflow: clip;">
								<!-- <PDFViewer
									scale={1.0}
							
									url={`https://uw-dev-documents-e1tez94r.s3.us-west-2.amazonaws.com/c42fdf5d3d1e873c8ae713110424968eec1dded045067183a387c5ff5e1b11de/document.pdf`}
								/> -->
								<PDFViewer
								scale={1.0}
								showBorder={false}
								showButtons={['']}
								url={getPageS3Url(
									currentDocument?.s3Bucket,
									currentDocument?.docHash,
									page.pageNumber
								)}
							/>
							</div>
						{/key}
					</div>
					<div class="md:col-span-1 lg:col-span-2 xl:col-span-3 md:mt-0 space-y-4">
						{#if currentDocument?.insights?.items}
							{#if currentDocument.insights.items.length === 0}
								<div class="text-gray-400">No insights found for this page.</div>
							{:else}
								<InsightTable
									insights={currentDocument.insights.items.filter(
										(i) => Number(i.pageId) + 1 === Number(page.id)
									)}
								/>
							{/if}
						{:else}
							<div class="text-gray-400">No insights found for this page.</div>
						{/if}

						{#if currentDocument?.texts?.items}
							{#each currentDocument.texts.items.filter((t) => t.pageNumber + 1 === page.pageNumber) as text}
								<Accordion>
									<AccordionItem>
										{#snippet header()}Show Raw Text{/snippet}
										<!-- <p class="mb-2 text-gray-500 dark:text-gray-400">
											Lorem ipsum dolor sit amet, consectetur adipisicing elit. Illo ab
											necessitatibus sint explicabo ...
										</p> -->
										<p class="text-gray-500 dark:text-gray-400">
											{page.pageNumber + 1}: {text.content}
										</p>
									</AccordionItem>
								</Accordion>
							{/each}
						{:else}
							<div class="text-gray-400">No text found for this page.</div>
						{/if}
					</div>
				</div>
			{/each}
		{:else}
			<p>No pages found.</p>
		{/if}
	</div>
{:else}
	<p class="text-sm text-gray-500 dark:text-gray-400">
		<b>Dashboard:</b>
		Click to load document analysis data...
	</p>
{/if}
