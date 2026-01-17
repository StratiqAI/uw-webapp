<!--
	+page.svelte - GraphQL Store Publisher Demonstration
-->

<script lang="ts">
	// ----------------------------------------------------------------------------
	// Imports
	// ----------------------------------------------------------------------------
	import { browser } from '$app/environment';
	import { ProjectSyncManager, store } from '$lib/realtime/websocket/projectSync';
	import type { Project } from '@stratiqai/types-simple';
	import { darkModeStore } from '$lib/stores/darkMode.svelte';

	// ----------------------------------------------------------------------------
	// Props + Core Reactive State
	// ----------------------------------------------------------------------------
	let { data } = $props();

	// Auth + UI theme
	const idToken = $derived(data?.idToken);
	const isDarkMode = $derived(darkModeStore.darkMode);

	// Manager lifecycle + UI state
	let projectSyncManager = $state(ProjectSyncManager.createInactive());

	// ----------------------------------------------------------------------------
	// Store-backed UI Data
	// ----------------------------------------------------------------------------
	// Type guard to ensure store data matches the Project shape
	function isValidProject(value: unknown): value is Project {
		return typeof value === 'object' && value !== null && 'id' in value && 'name' in value;
	}

	// Reactive list of projects (auto-updates when the store changes)
	let projects = $derived.by(() =>
		store.getAllAt<Project>('projects', { filter: (_key, value) => isValidProject(value) })
	);

	// Debug view of the store tree
	let storeTree = $derived(store.tree);

	// ----------------------------------------------------------------------------
	// Manager Lifecycle
	// ----------------------------------------------------------------------------
	$effect(() => {
		let aborted = false;

		// Create manager + initial sync for this token
		const initializeAndSync = async () => {
			try {
				if (!browser) return;
				await projectSyncManager.initialize({ idToken });
				if (aborted || !projectSyncManager.isReady) return;
				await projectSyncManager.syncList({
					queryVariables: { limit: 50, scope: 'OWNED_BY_ME' },
					setupSubscriptions: true,
					clearExisting: false
				});
			} catch (err: unknown) {
				if (aborted) return;
				console.error('Error syncing projects:', err);
			}
		};

		initializeAndSync();

		// Cleanup on token change/unmount
		return () => {
			aborted = true;
			projectSyncManager.cleanup();
		};
	});

	// ----------------------------------------------------------------------------
	// User Actions
	// ----------------------------------------------------------------------------
	async function handleSyncClick() {
		if (!projectSyncManager.isReady) return;
		try {
			await projectSyncManager.syncList({
				queryVariables: { limit: 50, scope: 'OWNED_BY_ME' },
				setupSubscriptions: true,
				clearExisting: true // Force clear on manual refresh
			});
		} catch (err: unknown) {
			console.error('Manual sync failed:', err);
		}
	}

	function handleClearClick() {
		projectSyncManager.cleanup();
		store.clearAllAt('projects');
		// Note: the effect will re-sync because the token hasn't changed.
	}

	// ----------------------------------------------------------------------------
	// Template Styles (derived for readability)
	// ----------------------------------------------------------------------------
	const containerClass = $derived(
		`p-6 min-h-screen ${isDarkMode ? 'bg-slate-900 text-slate-100' : 'bg-white text-slate-900'}`
	);
	const headerTextClass = $derived(
		`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`
	);
	const subTextClass = $derived(`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`);

	const errorBoxClass = $derived(
		`mb-4 rounded-md border p-4 ${
			isDarkMode
				? 'border-red-500 bg-red-900/30 text-red-300'
				: 'border-red-400 bg-red-100 text-red-700'
		}`
	);

	const btnBase = 'rounded px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50';
	const btnBlueClass = $derived(
		`${btnBase} ${isDarkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'}`
	);
	const btnRedClass = $derived(
		`${btnBase} ${isDarkMode ? 'bg-red-600 hover:bg-red-700' : 'bg-red-500 hover:bg-red-600'}`
	);

	const projectsContainerClass = $derived(
		`rounded-md border p-4 ${
			isDarkMode ? 'border-blue-600 bg-blue-900/30' : 'border-blue-300 bg-blue-50'
		}`
	);

	const cardClass = $derived(
		`group relative overflow-hidden rounded-lg border shadow-sm transition-all hover:shadow-md ${
			isDarkMode
				? 'border-blue-700 bg-slate-800 hover:border-blue-600'
				: 'border-blue-200 bg-white hover:border-blue-300'
		}`
	);

	const debugBoxClass = $derived(
		`mt-6 rounded-md border p-4 overflow-auto text-xs ${
			isDarkMode ? 'border-gray-700 bg-slate-800 text-slate-300' : 'border-gray-300 bg-gray-50 text-gray-700'
		}`
	);
</script>

<!-- ============================================================================
	 MAIN LAYOUT
	 ============================================================================ -->

<div class={containerClass}>
	<!-- Page Header -->
	<header class="mb-6">
		<h1 class={headerTextClass}>GraphQL Store Publisher Demo</h1>
		<p class="mt-2 {subTextClass}">
			Demonstrating GraphQLStorePublisher, GraphQLQueryClient, TopicMapper, and ValidatedTopicStore
		</p>
	</header>

	<!-- Error Display -->
	{#if projectSyncManager.lastError}
		<div class={errorBoxClass} role="alert">
			<strong>Error:</strong>
			{projectSyncManager.lastError}
		</div>
	{/if}

	<!-- Controls -->
	<div class="mb-6 flex gap-4">
		<button
			onclick={handleSyncClick}
			disabled={projectSyncManager.isLoading || !projectSyncManager.isReady}
			class={btnBlueClass}
		>
			{projectSyncManager.isLoading ? 'Syncing...' : 'Refresh Projects'}
		</button>

		<button
			onclick={handleClearClick}
			disabled={projects.length === 0}
			class={btnRedClass}
		>
			Clear Local Store
		</button>
	</div>

	<!-- Projects List -->
	<div class={projectsContainerClass}>
		<div class="mb-4 flex items-center justify-between">
			<strong class={isDarkMode ? 'text-blue-200' : 'text-blue-900'}>
				Projects in Store ({projects.length}):
			</strong>
		</div>

		{#if projects.length > 0}
			<!-- Render each project as a card -->
			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{#each projects as { id, data: project } (id)}
					<!-- Added keyed each block for better performance -->
					<div class={cardClass}>
						<div class="p-5">
							<!-- ID badge -->
							<div class="mb-3 text-xs {isDarkMode ? 'text-gray-400' : 'text-gray-500'}">
								#{id.split('/').pop()}
							</div>

							<!-- Project name -->
							<h3 class="mb-3 text-lg font-semibold {isDarkMode ? 'text-slate-100' : 'text-gray-900'}">
								{project.name || 'Unnamed Project'}
							</h3>

							<!-- Project details -->
							<div class="space-y-2">
								{#if project.description}
									<div class="text-sm {isDarkMode ? 'text-slate-300' : 'text-gray-700'}">
										{project.description}
									</div>
								{/if}

								<div class="text-xs {isDarkMode ? 'text-gray-400' : 'text-gray-500'}">
									Created: {project.createdAt
										? new Date(project.createdAt).toLocaleDateString()
										: 'N/A'}
								</div>
							</div>
						</div>
					</div>
				{/each}
			</div>
		{:else}
			<!-- Empty state -->
			<p class={subTextClass}>
				{#if projectSyncManager.isLoading}
					Loading projects...
				{:else if !projectSyncManager.isReady}
					Waiting for initialization...
				{:else}
					No projects found in store.
				{/if}
			</p>
		{/if}
	</div>

	<!-- Store Tree (Debug View) -->
	{#if storeTree && Object.keys(storeTree).length > 0}
		<div class={debugBoxClass}>
			<h2 class="mb-2 text-lg font-semibold">Store Tree (Debug)</h2>
			<pre>{JSON.stringify(storeTree, null, 2)}</pre>
		</div>
	{/if}
</div>