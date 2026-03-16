<script lang="ts">
	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	// Import Types and Data Stores
	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	import type { Project, Doclink } from '$lib/types/cloud/app';
	import { browser } from '$app/environment';
	
	// ProjectDocument type for PDFViewer (id and filename)
	interface ProjectDocument {
		id: string;
		filename: string;
	}
	
	// Use ValidatedTopicStore instead of appStateStore
	import { store } from '$lib/realtime/websocket/projectSync';
	
	// Import DocumentEntitiesSyncManager for fetching texts, tables, and images
	import { DocumentEntitiesSyncManager } from '$lib/realtime/websocket/syncManagers/DocumentEntitiesSyncManager';
	
	import { darkModeStore } from '$lib/stores/darkMode.svelte';
	
	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	// Import Application Defined Components
	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	import type { Prompt } from '@stratiqai/types-simple';
	import ProjectEntitiesDisplay from '$lib/components/ProjectEntities/ProjectEntitiesDisplay.svelte';
	import PDFViewer from '$lib/components/PDFViewer/PDFViewer.svelte';
	import DocumentAnalysisPromptsSidebar from './components/DocumentAnalysisPromptsSidebar.svelte';
	import PromptEditModal from '../../../../library/components/PromptEditModal.svelte';
	import { updatePromptTemplate, createPromptTemplate, type AIQueryData } from '../../../../library/PromptService';
	import { GraphQLQueryClient } from '$lib/realtime/store/GraphQLQueryClient';
	import { gql } from '$lib/realtime/graphql/requestHandler';
	import { Q_DOCUMENT_VISION_QUERY } from '$lib/realtime/graphql/queries/DocumentVisionQuery';

	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	// Initialize the state variables for this component
	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	
	// Get page data including idToken
	let { data } = $props();
	const idToken = $derived(data?.idToken);
	
	// Get projectId from route params
	import { page } from '$app/stores';
	const projectId = $derived($page.params.projectId ?? null);

	// Dark mode support
	const darkMode = $derived(darkModeStore.darkMode);
	
	// Document entities sync manager instance
	let documentEntitiesManager = $state<DocumentEntitiesSyncManager | null>(null);
	let isLoadingEntities = $state(false);
	let entitiesError = $state<string | null>(null);
	
	// Track which document IDs we've already fetched to prevent re-fetching
	let lastFetchedDocIds = $state<string>('');

	// Vision query (CRE structured output sidebar): state and result
	interface VisionQueryResult {
		answer: string;
		structuredOutput?: unknown;
		matchCount: number;
	}
	let visionQueryResult = $state<VisionQueryResult | null>(null);
	let visionQueryLoading = $state(false);
	let visionQueryError = $state<string | null>(null);
	let lastSelectedPrompt = $state<Prompt | null>(null);

	// Prompt edit modal: edit existing (click in sidebar) or create new
	let editingPrompt = $state<Prompt | null>(null);
	let isCreatingPrompt = $state(false);
	let promptSaveLoading = $state(false);
	let promptsRefreshTrigger = $state(0);

	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	// Component Variables that are Derived from the Stores
	// Do not modify these variables directly
	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-

	// Get current project from ValidatedTopicStore
	const project = $derived.by(() => {
		if (!projectId) return null;
		return store.at<Project>(`projects/${projectId}`) ?? null;
	});

	// Get doclinks from project (these link to documents)
	const doclinks = $derived.by(() => {
		const currentProject = project;
		if (!currentProject?.doclinks) return [] as Doclink[];
		const links = currentProject.doclinks;
		if (Array.isArray(links)) {
			return links;
		}
		return (links as { items: Doclink[] })?.items || [];
	});

	// Convert doclinks to ProjectDocument format for PDFViewer
	// The id should be the documentId (SHA256 hash) which is used in the S3 URL path
	const documents = $derived.by(() => {
		return doclinks
			.filter((link) => link.documentId && link.filename)
			.map((link) => ({
				id: link.documentId!, // This is the SHA256 hash used in S3 path: {hash}/document.pdf
				filename: link.filename
			})) as ProjectDocument[];
	});

	// Selected document state for PDFViewer
	let selectedDocId = $state<string>('');
	let currentPage = $state(1);

	// Always select the first document by default when documents are available
	$effect(() => {
		if (documents.length > 0) {
			const firstDocId = documents[0].id;
			// Always select the first document if none is selected, or if the current selection is invalid
			if (!selectedDocId || !documents.some((doc) => doc.id === selectedDocId)) {
				selectedDocId = firstDocId;
				currentPage = 1; // Reset to first page when changing documents
			}
		} else if (selectedDocId) {
			// Clear selection if documents list becomes empty
			selectedDocId = '';
		}
	});

	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	// Fetch document entities using DocumentEntitiesSyncManager
	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	
	// Create a stable key from document IDs to detect actual changes
	const documentIdsKey = $derived(documents.map(doc => doc.id).sort().join(','));
	
	/**
	 * Initialize and fetch document entities when documents are available
	 */
	async function fetchDocumentEntities(documentIds: string[], token: string, pid: string): Promise<void> {
		if (!browser) return;

		isLoadingEntities = true;
		entitiesError = null;

		try {
			// Cleanup existing manager if any
			if (documentEntitiesManager) {
				documentEntitiesManager.cleanup();
			}

			// Create and initialize the manager
			documentEntitiesManager = await DocumentEntitiesSyncManager.create({
				idToken: token,
				projectId: pid,
				documentIds
			});
		} catch (err) {
			console.error('Failed to fetch document entities:', err);
			entitiesError = err instanceof Error ? err.message : 'Failed to load document entities';
		} finally {
			isLoadingEntities = false;
		}
	}

	// Fetch entities when document IDs change (using stable key comparison)
	$effect(() => {
		const docIdsKey = documentIdsKey;
		const token = idToken;
		const pid = projectId;
		
		// Only fetch if we have valid data and the document IDs have actually changed
		if (browser && token && pid && docIdsKey && docIdsKey !== lastFetchedDocIds) {
			lastFetchedDocIds = docIdsKey;
			const documentIds = docIdsKey.split(',').filter(id => id);
			if (documentIds.length > 0) {
				fetchDocumentEntities(documentIds, token, pid);
			}
		}
	});

	// Cleanup on component destroy
	$effect(() => {
		return () => {
			if (documentEntitiesManager) {
				documentEntitiesManager.cleanup();
			}
		};
	});

	// When user clicks a prompt in the sidebar: open the same edit dialog as the library
	function handleSelectPrompt(prompt: Prompt) {
		editingPrompt = prompt;
		isCreatingPrompt = false;
	}

	function handleCreatePrompt() {
		editingPrompt = null;
		isCreatingPrompt = true;
	}

	// Run vision query with a prompt (e.g. from a "Run on documents" action)
	async function runVisionQueryWithPrompt(prompt: Prompt) {
		const docIds = documents.map((d) => d.id);
		if (!idToken || docIds.length === 0) return;
		const question = prompt.content?.body?.trim() || prompt.name || 'Answer based on the document.';
		visionQueryLoading = true;
		visionQueryError = null;
		lastSelectedPrompt = prompt;
		try {
			const data = await gql<{ documentVisionQuery: VisionQueryResult }>(
				Q_DOCUMENT_VISION_QUERY,
				{
					input: {
						documentIds: docIds,
						question,
						topK: 5
					}
				},
				idToken
			);
			visionQueryResult = data.documentVisionQuery;
		} catch (err) {
			visionQueryError = err instanceof Error ? err.message : 'Vision query failed';
			visionQueryResult = null;
		} finally {
			visionQueryLoading = false;
		}
	}

	async function handleSavePrompt(saveData: {
		name: string;
		description: string;
		aiQueryData: AIQueryData;
		outputSchema?: { name: string; description?: string; schemaDefinition: unknown };
	}) {
		if (!idToken) {
			alert('Unable to save: session missing. Please refresh and try again.');
			return;
		}
		promptSaveLoading = true;
		try {
			const queryClient = new GraphQLQueryClient(idToken);
			if (isCreatingPrompt) {
				if (!projectId) {
					alert('Unable to create prompt: no project selected. Open a project first.');
					return;
				}
				await createPromptTemplate(
					queryClient,
					projectId,
					saveData.name,
					saveData.aiQueryData,
					saveData.description || undefined,
					saveData.outputSchema
				);
				isCreatingPrompt = false;
				promptsRefreshTrigger += 1;
			} else if (editingPrompt) {
				await updatePromptTemplate(
					queryClient,
					editingPrompt.id,
					{
						name: saveData.name,
						description: saveData.description,
						aiQueryData: saveData.aiQueryData,
						...(saveData.outputSchema && { outputSchema: saveData.outputSchema })
					},
					(editingPrompt as { parentId?: string }).parentId
				);
				editingPrompt = null;
			}
		} catch (err) {
			console.error('Failed to save prompt:', err);
			throw err;
		} finally {
			promptSaveLoading = false;
		}
	}

	function handleCancelPrompt() {
		editingPrompt = null;
		isCreatingPrompt = false;
	}
</script>

<div class="flex h-full w-full overflow-hidden">
	<div class="flex-1 overflow-y-auto">
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

		<!-- Structured query result (CRE sidebar vision query) -->
		{#if visionQueryLoading}
			<div class="mb-8 {darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} rounded-lg border shadow-sm p-6">
				<div class="flex items-center gap-3">
					<svg class="animate-spin h-5 w-5 {darkMode ? 'text-indigo-400' : 'text-indigo-600'}" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
						<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
						<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
					</svg>
					<span class="{darkMode ? 'text-slate-300' : 'text-slate-600'}">Running structured query...</span>
				</div>
			</div>
		{:else if visionQueryError}
			<div class="mb-8 {darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} rounded-lg border shadow-sm p-6">
				<div class="flex items-center justify-between gap-4">
					<div class="flex items-center gap-2 {darkMode ? 'text-red-400' : 'text-red-600'}">
						<svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
						</svg>
						<span class="font-medium">Query failed</span>
					</div>
					<button
						type="button"
						onclick={() => { visionQueryError = null; }}
						class="rounded border px-2 py-1 text-sm {darkMode ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-300 text-slate-700 hover:bg-slate-100'}"
					>Dismiss</button>
				</div>
				<p class="mt-2 text-sm {darkMode ? 'text-slate-400' : 'text-slate-600'}">{visionQueryError}</p>
			</div>
		{:else if visionQueryResult != null}
			<div class="mb-8 {darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} rounded-lg border shadow-sm">
				<div class="flex items-center justify-between gap-4 p-4 border-b {darkMode ? 'border-slate-700' : 'border-slate-200'}">
					<h3 class="text-lg font-semibold {darkMode ? 'text-white' : 'text-slate-900'}">
						Query result
						{#if lastSelectedPrompt}
							<span class="text-sm font-normal {darkMode ? 'text-slate-400' : 'text-slate-500'}"> — {lastSelectedPrompt.name}</span>
						{/if}
					</h3>
					<button
						type="button"
						onclick={() => { visionQueryResult = null; lastSelectedPrompt = null; }}
						class="rounded border px-2 py-1 text-sm {darkMode ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-300 text-slate-700 hover:bg-slate-100'}"
					>Clear</button>
				</div>
				<div class="p-6 space-y-4">
					<div>
						<p class="text-sm font-medium {darkMode ? 'text-slate-400' : 'text-slate-500'} mb-1">Answer</p>
						<p class="whitespace-pre-wrap {darkMode ? 'text-slate-200' : 'text-slate-800'}">{visionQueryResult.answer}</p>
					</div>
					{#if visionQueryResult.structuredOutput != null && typeof visionQueryResult.structuredOutput === 'object'}
						<div>
							<p class="text-sm font-medium {darkMode ? 'text-slate-400' : 'text-slate-500'} mb-1">Structured output</p>
							<pre class="text-xs overflow-x-auto p-3 rounded {darkMode ? 'bg-slate-900 text-slate-300' : 'bg-slate-100 text-slate-700'}">{JSON.stringify(visionQueryResult.structuredOutput, null, 2)}</pre>
						</div>
					{/if}
					<p class="text-xs {darkMode ? 'text-slate-500' : 'text-slate-500'}">Based on {visionQueryResult.matchCount} image(s)</p>
				</div>
			</div>
		{/if}

		<!-- PDF Viewer -->
		{#if documents.length > 0 && selectedDocId}
			<div class="mb-8 {darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} rounded-lg border shadow-sm">
				<div class="p-6">
					<h3 class="text-lg font-semibold {darkMode ? 'text-white' : 'text-slate-900'} mb-4">
						Documents ({documents.length})
					</h3>
					<PDFViewer
						documents={documents}
						bind:currentDocHash={selectedDocId}
						bind:currentPage={currentPage}
						showButtons={['navigation', 'zoom', 'rotate', 'download']}
					/>
				</div>
			</div>
		{/if}

		<!-- Document Entities Display -->
		{#if projectId}
			<div class="{darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} rounded-lg border shadow-sm">
				<div class="p-6">
					{#if isLoadingEntities}
						<div class="flex items-center justify-center py-8">
							<div class="flex items-center gap-3">
								<svg class="animate-spin h-5 w-5 {darkMode ? 'text-indigo-400' : 'text-indigo-600'}" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
									<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
									<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
								</svg>
								<span class="{darkMode ? 'text-slate-300' : 'text-slate-600'}">Loading document entities...</span>
							</div>
						</div>
					{:else if entitiesError}
						<div class="p-4 {darkMode ? 'bg-red-900/20 border-red-500/30' : 'bg-red-50 border-red-200'} rounded-lg border">
							<div class="flex items-center gap-2 text-red-600 dark:text-red-400">
								<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
								</svg>
								<span class="font-medium">Error loading entities</span>
							</div>
							<p class="mt-1 text-sm {darkMode ? 'text-red-300' : 'text-red-600'}">{entitiesError}</p>
							<button
								onclick={() => {
									lastFetchedDocIds = ''; // Reset to allow re-fetch
									const docIds = documents.map(doc => doc.id);
									if (idToken && projectId && docIds.length > 0) {
										fetchDocumentEntities(docIds, idToken, projectId);
									}
								}}
								class="mt-3 px-3 py-1.5 text-sm font-medium {darkMode ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-red-100 hover:bg-red-200 text-red-700'} rounded-md transition-colors"
							>
								Retry
							</button>
						</div>
					{:else}
						<ProjectEntitiesDisplay {projectId} {documents} />
					{/if}
				</div>
			</div>
		{/if}

		<!-- Empty State -->
		{#if documents.length === 0 || !selectedDocId}
			<div class="{darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} rounded-lg border shadow-sm">
				<div class="text-center py-12 px-6">
					<div class="mb-4">
						<svg
							class="mx-auto h-16 w-16 {darkMode ? 'text-slate-400' : 'text-slate-300'}"
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
					<h3 class="text-lg font-semibold {darkMode ? 'text-white' : 'text-slate-900'} mb-2">
						No documents uploaded yet
					</h3>
					<p class="text-sm {darkMode ? 'text-slate-400' : 'text-slate-600'} mb-4">
						Upload your first document to get started with document analysis.
					</p>
					{#if projectId}
						<a
							href="/projects/workspace/{projectId}/get-started"
							class="inline-flex items-center gap-2 px-4 py-2 {darkMode ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'} rounded-lg font-medium transition-colors"
						>
							<svg
								class="w-5 h-5"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
								></path>
							</svg>
							Go to Get Started
						</a>
					{/if}
				</div>
			</div>
		{/if}
	</div>
	</div>

	<!-- Prompts sidebar (right) - same prompts as library -->
	<DocumentAnalysisPromptsSidebar
		{idToken}
		{darkMode}
		isLoading={visionQueryLoading}
		refreshTrigger={promptsRefreshTrigger}
		onSelectPrompt={handleSelectPrompt}
		onCreatePrompt={handleCreatePrompt}
	/>

	<!-- Same edit dialog as Prompt library: open when editing or creating a prompt -->
	{#if editingPrompt || isCreatingPrompt}
		<PromptEditModal
			{darkMode}
			template={editingPrompt}
			isCreating={isCreatingPrompt}
			onSave={handleSavePrompt}
			onCancel={handleCancelPrompt}
		/>
	{/if}
</div>
