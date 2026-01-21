<!-- +page.svelte -->
<script lang="ts">
	import { browser } from '$app/environment';
	import { page } from '$app/stores';
	import DocumentUpload from '$lib/components/DocumentUpload/DocumentUpload.svelte';
	import { ProjectSyncManager, store } from '$lib/realtime/websocket/projectSync';
	import { authStore } from '$lib/stores/auth.svelte';
	import { darkModeStore } from '$lib/stores/darkMode.svelte';
	import type { Project, Doclink } from '@stratiqai/types-simple';

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
				if (!projectFromServer) {
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
				<DocumentUpload idToken={cognitoIdToken} projectId={projectId} metadata={fileMetadata} />
			</div>
		</div>

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

