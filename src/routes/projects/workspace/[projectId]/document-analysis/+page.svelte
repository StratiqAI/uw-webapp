<script lang="ts">
	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	// Import Types and Data Stores
	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	import type { Project, Doclink } from '$lib/types/cloud/app';
	
	// The project store holds the state for the workspace. 
	// It's initialized from data loaded on the server side and passed to the client.
	import { project as projectStore } from '$lib/stores/appStateStore';
	
	// Import project entities store for displaying discovered text, tables, and images
	import { getProjectTextsStore, getProjectTablesStore, getProjectImagesStore } from '$lib/stores/projectEntitiesStore';
	import { darkModeStore } from '$lib/stores/darkMode.svelte';
	
	// Access mapStore from parent layout context
	import { getContext } from 'svelte';
	
	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	// Import Application Defined Components
	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	import ProjectEntitiesDisplay from '$lib/components/ProjectEntities/ProjectEntitiesDisplay.svelte';

	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	// Initialize the state variables for this component
	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	
	// Get projectId from route params
	import { page } from '$app/stores';
	const projectId = $derived($page.params.projectId ?? null);
	
	// Get mapStore from parent layout context
	const mapStore = getContext('mapStore') as any;

	// Dark mode support
	const darkMode = $derived(darkModeStore.darkMode);

	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	// Component Variables that are Derived from the Stores
	// Do not modify these variables directly
	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-

	// Projects belong to users and hold the documents
	let project = $derived($projectStore);

	// Get projectDocumentLinks from project (these link to documents)
	const projectDocumentLinks = $derived.by(() => {
		const currentProject = $projectStore;
		// Access projectDocumentLinks with type assertion (Project type extends StratiqProject)
		const projectWithLinks = currentProject as any as Project;
		if (!projectWithLinks?.projectDocumentLinks) return [] as ProjectDocumentLink[];
		const links = projectWithLinks.projectDocumentLinks;
		if (Array.isArray(links)) {
			return links;
		}
		return (links as { items: ProjectDocumentLink[] }).items || [];
	});

	// Get reactive stores for project entities (using $derived.by to react to projectId changes)
	const texts = $derived.by(() => {
		const pid = $page.params.projectId ?? null;
		return pid ? getProjectTextsStore(pid) : null;
	});
	const tables = $derived.by(() => {
		const pid = $page.params.projectId ?? null;
		return pid ? getProjectTablesStore(pid) : null;
	});
	const images = $derived.by(() => {
		const pid = $page.params.projectId ?? null;
		return pid ? getProjectImagesStore(pid) : null;
	});
</script>

<div class="w-full">
	<div class="mx-auto max-w-7xl px-6 py-8">
		<!-- Header -->
		<div class="mb-8">
			<div class="flex items-center gap-3 mb-3">
				<div class="w-1 h-8 {darkMode ? 'bg-indigo-500' : 'bg-indigo-600'} rounded-full"></div>
				<h2 class="text-xl font-semibold {darkMode ? 'text-white' : 'text-slate-900'}">
					Document <span class="{darkMode ? 'text-indigo-400' : 'text-indigo-600'}">Analysis</span>
				</h2>
			</div>
			<p class="text-sm {darkMode ? 'text-slate-400' : 'text-slate-600'} ml-4">
				View discovered text, tables, and images from your uploaded documents.
			</p>
		</div>

		<!-- Documents List -->
		{#if projectDocumentLinks.length > 0}
			<div class="mb-8 {darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} rounded-lg border shadow-sm">
				<div class="p-6">
					<h3 class="text-lg font-semibold {darkMode ? 'text-white' : 'text-slate-900'} mb-4">
						Documents ({projectDocumentLinks.length})
					</h3>
					<div class="space-y-2">
						{#each projectDocumentLinks as link (link.id)}
							<div class="p-4 {darkMode ? 'bg-slate-700/50 border-slate-600' : 'bg-slate-50 border-slate-200'} rounded-lg border">
								<div class="flex items-center justify-between">
									<div class="flex items-center gap-3">
										<div class="w-10 h-10 {darkMode ? 'bg-indigo-900' : 'bg-indigo-100'} rounded-lg flex items-center justify-center">
											<svg
												class="h-5 w-5 {darkMode ? 'text-indigo-300' : 'text-indigo-600'}"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
												></path>
											</svg>
										</div>
										<div>
											<div class="font-medium {darkMode ? 'text-white' : 'text-slate-900'}">
												{link.filename}
											</div>
											<div class="text-xs {darkMode ? 'text-slate-400' : 'text-slate-500'}">
												Document ID: {link.documentId}
											</div>
										</div>
									</div>
									<div class="text-xs {darkMode ? 'text-slate-400' : 'text-slate-500'}">
										Status: {link.status}
									</div>
								</div>
							</div>
						{/each}
					</div>
				</div>
			</div>
		{/if}

		<!-- Real-time Entity Discovery -->
		{#if projectId}
			<div class="{darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} rounded-lg border shadow-sm">
				<div class="p-6">
					<ProjectEntitiesDisplay {projectId} />
				</div>
			</div>
		{/if}

		<!-- Empty State -->
		{#if projectDocumentLinks.length === 0}
			<div class="text-center py-12 {darkMode ? 'text-slate-400' : 'text-slate-500'}">
				<div class="mb-4">
					<svg
						class="mx-auto h-16 w-16 {darkMode ? 'text-slate-600' : 'text-slate-300'}"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
						></path>
					</svg>
				</div>
				<p class="text-base font-medium mb-2">No documents uploaded yet</p>
				<p class="text-sm">
					Go to <a href="/projects/workspace/{projectId}/get-started" class="{darkMode ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-700'} underline">Get Started</a> to upload your first document.
				</p>
			</div>
		{/if}
	</div>
</div>
