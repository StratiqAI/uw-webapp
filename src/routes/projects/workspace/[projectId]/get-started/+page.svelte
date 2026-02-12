<!-- +page.svelte -->
<script lang="ts">
	import { browser } from '$app/environment';
	import { page } from '$app/stores';
	import DocumentUpload from '$lib/components/DocumentUpload/DocumentUpload.svelte';
	import ProjectEntitiesDisplay from '$lib/components/ProjectEntities/ProjectEntitiesDisplay.svelte';
	import { ProjectSyncManager, store } from '$lib/realtime/websocket/projectSync';
	import { DocumentEntitiesSyncManager } from '$lib/realtime/websocket/syncManagers/DocumentEntitiesSyncManager';
	import { authStore } from '$lib/stores/auth.svelte';
	import { darkModeStore } from '$lib/stores/darkMode.svelte';
	import type { Project, Doclink } from '@agnathan/types-simple';

	let { data } = $props();

	// Use server-side idToken from page data, fallback to authStore if not available
	const cognitoIdToken = $derived(data.idToken ?? authStore.idToken);
	// Use server-side currentUser first (available during SSR), then fallback to authStore
	const currentUser = $derived(data.currentUser ?? authStore.currentUser);
	const isNewProject = $derived(data.isNewProject);
	// Get projectId from route params
	const projectId = $derived($page.params.projectId ?? null);
	const projectFromServer = $derived(data.project ?? null);

	// Manager lifecycle
	let projectSyncManager = $state(ProjectSyncManager.createInactive());
	
	// Document entities sync manager instance
	let documentEntitiesManager = $state<DocumentEntitiesSyncManager | null>(null);
	let isLoadingEntities = $state(false);
	let entitiesError = $state<string | null>(null);
	
	// Track which document IDs we've already fetched to prevent re-fetching
	let lastFetchedDocIds = $state<string>('');

	// Get project from store (reactive to store changes)
	// Use store.at() to directly access the project instead of getAllAtArray
	// which creates new arrays and can cause infinite loops
	const project = $derived.by(() => {
		if (!projectId) return null;
		return store.at<Project>(`projects/${projectId}`) ?? null;
	});

	// Extract doclinks from the project (supports connection or array formats)
	const doclinks = $derived.by(() => {
		if (!project) return [];
		const links = (project as any)?.doclinks;
		if (!links) return [];
		if (Array.isArray(links)) return links as Doclink[];
		return (links.items || []) as Doclink[];
	});

	// Convert doclinks to ProjectDocument format for ProjectEntitiesDisplay
	// The id should be the documentId (SHA256 hash) which is used in the S3 URL path
	const documents = $derived.by(() => {
		return doclinks
			.filter((link) => link.documentId && link.filename)
			.map((link) => ({
				id: link.documentId!, // This is the SHA256 hash used in S3 path: {hash}/document.pdf
				filename: link.filename
			}));
	});

	// Dark mode support
	const darkMode = $derived.by(() => darkModeStore.darkMode);

	// Sync single project when projectId is available
	$effect(() => {
		if (!browser || !projectId || !cognitoIdToken || isNewProject) return;

		let aborted = false;

		async function syncProject() {
			try {
				// Initialize manager if not ready
				if (!projectSyncManager.isReady) {
					const initialItems = projectFromServer ? [projectFromServer] : [];
					await projectSyncManager.initialize({
						idToken: cognitoIdToken,
						initialItems,
						setupSubscriptions: true,
						clearExisting: false
					});
				}

				if (aborted || !projectSyncManager.isReady) return;

				// Sync the single project (this will include doclinks from the query)
				if (!projectFromServer && projectId) {
					await projectSyncManager.syncOne(projectId, {
						setupSubscriptions: true
					});
				}
			} catch (err) {
				if (aborted) return;
				// Error handled silently
			}
		}

		syncProject();

		return () => {
			aborted = true;
		};
	});

	// Construct file metadata for S3 uploads
	// This must be available before uploads can start
	const fileMetadata = $derived.by(() => {
		// Check for required fields
		const hasOwnerId = !!currentUser?.sub;
		const hasProjectId = !!projectId;
		
		if (!hasOwnerId || !hasProjectId) {
			return null;
		}
		
		return {
			tenantId: project?.tenantId || currentUser.tenant || authStore.currentUser?.tenant || 'default',
			ownerId: currentUser.sub,
			parentId: projectId
		};
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
		const token = cognitoIdToken;
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
</script>

<!-- Main Content Area -->
<div class="w-full">
	<div class="mx-auto max-w-4xl px-6 py-8">
		<!-- Welcome Section -->
		<div class="mb-8">
			<div class="flex items-center gap-3 mb-3">
				<div class="w-1 h-8 {darkMode ? 'bg-indigo-500' : 'bg-indigo-600'} rounded-full"></div>
				<h2 class="text-xl font-semibold {darkMode ? 'text-white' : 'text-slate-900'}">
					Welcome to Your <span class="{darkMode ? 'text-indigo-400' : 'text-indigo-600'}">Workspace</span>
				</h2>
			</div>
			<p class="text-sm {darkMode ? 'text-slate-400' : 'text-slate-600'} ml-4">
				Get started by uploading your first property or document to begin your analysis.
			</p>
		</div>

		<!-- Upload Section -->
		<div class="{darkMode ? 'bg-gradient-to-br from-slate-800 via-slate-800 to-indigo-900/20 border-indigo-500/30' : 'bg-gradient-to-br from-white via-indigo-50/50 to-white border-indigo-200'} rounded-lg border-2 shadow-lg hover:shadow-xl transition-shadow">
			<div class="p-6">
				<DocumentUpload
					idToken={cognitoIdToken}
					projectId={projectId}
					metadata={fileMetadata}
					onDoclinkRemoved={async () => {
						if (projectId && projectSyncManager.isReady) {
							await projectSyncManager.syncOne(projectId, {});
						}
					}}
				/>
			</div>
		</div>

		<!-- Real-time Discovery Section -->
		{#if projectId && documents.length > 0}
			<div class="mt-8 {darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} rounded-lg border shadow-sm">
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
									if (cognitoIdToken && projectId && docIds.length > 0) {
										fetchDocumentEntities(docIds, cognitoIdToken, projectId);
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

		<!-- Doclinks Display -->
		<!-- {#if projectId && doclinks.length > 0}
			<div class="mt-8 {darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} rounded-lg border shadow-sm">
				<div class="p-6">
					<div class="flex items-center gap-3 mb-4">
						<div class="w-1 h-6 {darkMode ? 'bg-indigo-500' : 'bg-indigo-600'} rounded-full"></div>
						<h3 class="text-lg font-semibold {darkMode ? 'text-white' : 'text-slate-900'}">
							Document Links
						</h3>
						<span class="text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'}">
							({doclinks.length})
						</span>
					</div>
					<div class="space-y-2">
						{#each doclinks as doclink (doclink.id)}
							<div class="p-3 {darkMode ? 'bg-slate-700/50 border-slate-600' : 'bg-slate-50 border-slate-200'} rounded-lg border">
								<div class="flex items-center justify-between">
									<div class="flex-1 min-w-0">
										<div class="font-medium {darkMode ? 'text-slate-200' : 'text-slate-900'} truncate">
											{doclink.filename || 'Untitled Document'}
										</div>
										{#if doclink.status}
											<div class="text-xs {darkMode ? 'text-slate-400' : 'text-slate-500'} mt-1">
												Status: {doclink.status}
											</div>
										{/if}
									</div>
									{#if doclink.documentId}
										<a 
											href="/projects/workspace/{projectId}/document-analysis?documentId={doclink.documentId}"
											class="ml-4 text-sm {darkMode ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-700'} font-medium hover:underline transition-colors"
										>
											View
										</a>
									{/if}
								</div>
							</div>
						{/each}
					</div>
				</div>
			</div>
		{/if} -->

		<!-- Help Link -->
		<div class="mt-6 text-center">
			<a 
				href="/blog/uploading-your-first-property" 
				class="text-sm {darkMode ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-700'} font-medium hover:underline transition-colors inline-flex items-center gap-2 group"
			>
				<span>Learn more about uploading documents</span>
				<svg class="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
				</svg>
			</a>
		</div>
	</div>
</div>

