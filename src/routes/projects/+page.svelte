<script lang="ts">
	import { logger } from '$lib/logging/debug';
	import { darkModeStore } from '$lib/stores/darkMode.svelte';

	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	// Props Section
	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-

	// Import the SvelteKit Types for the Page Properties
	import type { PageProps } from './$types';
	import { goto } from '$app/navigation';

	// Get the Props for the Component
	let componentProps: PageProps = $props();

	// Get the authenticated current User from the Load Data
	let currentUser = $derived(componentProps.data?.currentUser);

	// Get idToken from server-side load function
	let idToken = componentProps.data.idToken!;

	// Use unified dark mode store
	let darkMode = $derived.by(() => darkModeStore.darkMode);
	let toggleDarkMode = darkModeStore.toggle;

	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	// Realtime Section
	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-

	// 1. Import public environment variables for GraphQL endpoint and API key
	import { PUBLIC_GRAPHQL_HTTP_ENDPOINT } from '$env/static/public';

	// 2. Import types for user items
	import type { Project } from '@stratiqai/types';
	import { GraphQLOperationGenerator, ProjectSchemas } from '@stratiqai/types';
	const projectGenerator = new GraphQLOperationGenerator('Project', ProjectSchemas);
	const S_PROJECT_CREATED = projectGenerator.generateSubscription({
		eventType: 'create',
		filterBy: 'ownerId',
		filterType: 'ID!'
	});
	const S_PROJECT_DELETED = projectGenerator.generateSubscription({
		eventType: 'delete',
		filterBy: 'ownerId',
		filterType: 'ID!'
	});
	const M_CREATE_PROJECT = projectGenerator.generateCreateMutation();
	const M_DELETE_PROJECT = projectGenerator.generateDeleteMutation();

	// 3. Import realtime subscription setup
	import { AppSyncWsClient } from '$lib/realtime/websocket/AppSyncWsClient';

	// 4. Import list operations for Project
	import { createListOps } from '$lib/realtime/websocket/ListOperations';

	// 6. Create reactive state for Project list
	let projects = $state<Project[]>(componentProps.data?.items);

	// 6. Create list operations for Project
	export const projectListOps = createListOps<Project>({
		keyFor: (it) => it.id
	});

	// Search state
	let searchFilter = $state('');
	let showEmailInfo = $state(false);

	// Personalized pipeline email
	let pipelineEmail = $derived.by(() => {
		if (currentUser?.email) {
			const localPart = currentUser.email.split('@')[0];
			return `${localPart}-pipeline@stratiqai.com`;
		}
		return 'your-email-pipeline@stratiqai.com';
	});

	// Filtered projects
	let filteredProjects = $derived(
		projects.filter((project) => {
			if (!searchFilter) return true;
			const searchLower = searchFilter.toLowerCase();
			return (
				project.name?.toLowerCase().includes(searchLower) ||
				project.description?.toLowerCase().includes(searchLower)
			);
		})
	);

	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	// Effects Section
	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-

	// Set up GraphQL realtime subscriptions when component is mounted
	$effect.root(() => {
		// Only run on the client (not during SSR)
		if (typeof window === 'undefined') return;

		// Check if idToken is available before setting up WebSocket
		if (!idToken) {
			console.error('No idToken available for WebSocket authentication');
			return;
		}

		logger('Setting up WebSocket with idToken:', idToken ? 'present' : 'missing');

		const client = new AppSyncWsClient({
			graphqlHttpUrl: PUBLIC_GRAPHQL_HTTP_ENDPOINT,
			auth: { mode: 'cognito', idToken },
			subscriptions: [
				{
					query: S_PROJECT_CREATED,
					variables: { ownerId: currentUser?.sub || '' },
					path: 'onCreateProject',
					next: (it: Project) => {
						console.log('Project created subscription received:', it);
						projectListOps.upsertMutable(projects, it);
					},
					error: (err: any) => console.error('project creation sub error', err)
				},
				{
					query: S_PROJECT_DELETED,
					variables: { ownerId: currentUser?.sub || '' },
					path: 'onDeleteProject',
					next: (it: Project) => projectListOps.removeMutable(projects, it),
					error: (err: any) => console.error('project deletion sub error', err)
				}
			]
		});

		// Return disposer to clean up subscriptions on component unmount/HMR
		return () => client.disconnect();
	});

	// Reactive error message, initially null
	let errorMsg = $state<string | null>(null);

	// Local Components
	import DeleteModal from '$lib/components/Dialog/DeleteModal.svelte';
	import ProjectModal from './ProjectModal.svelte';
	import MetaTag from './MetaTag.svelte';
	import { gql } from '$lib/realtime/graphql/requestHandler';

	// State
	let openProject: boolean = $state(false); // modal control
	let openDelete: boolean = $state(false); // modal control
	let current_project: any = $state({});

	// Meta Tags
	const path: string = '/projects';
	const description: string = 'My StratiqAI Projects';
	const title: string = 'My StratiqAI Projects';
	const subtitle: string = 'My StratiqAI Projects';

	async function createNewProjectHandler(e: Event) {
		e.preventDefault();

		// Prepare input for create project mutation - only name is required
		const input = {
			name: 'New Project'
		};

		try {
			const res = await gql<{ createProject: Project }>(M_CREATE_PROJECT, { input }, idToken);
			const projectId = res.createProject.id;
			await goto(`/projects/workspace/${projectId}/get-started`);
		} catch (err) {
			console.error('Error creating new project:', err);
			alert('Error creating new project');
		}
	}
</script>

<MetaTag {path} {description} {title} {subtitle} />

<div class="flex h-screen w-full overflow-hidden {darkMode ? 'bg-slate-900' : 'bg-slate-50'} transition-colors">
	<!-- Main Content Area -->
	<div class="flex-1 flex flex-col overflow-hidden {darkMode ? 'bg-slate-900' : 'bg-white'}">
		<!-- Header -->
		<div class="h-14 {darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border-b flex items-center justify-between px-6 shadow-sm">
			<div class="flex items-center gap-4">
				<div class="w-10 h-10 {darkMode ? 'bg-indigo-900' : 'bg-indigo-100'} rounded-lg flex items-center justify-center">
					<svg class="w-5 h-5 {darkMode ? 'text-indigo-300' : 'text-indigo-600'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 8h10M9 12h10M9 16h10M4.99 8H5m-.02 4h.01m0 4H5"></path>
					</svg>
				</div>
				<h1 class="text-2xl font-semibold {darkMode ? 'text-white' : 'text-slate-900'} tracking-tight">Investment Pipeline</h1>
				<div class="h-4 w-px {darkMode ? 'bg-slate-700' : 'bg-slate-200'}"></div>
				<span class="text-sm {darkMode ? 'text-slate-300' : 'text-slate-600'}">
					{filteredProjects.length} {filteredProjects.length === 1 ? 'project' : 'projects'}
				</span>
			</div>
			<div class="flex items-center gap-2">
				<button
					class="p-2 {darkMode ? 'text-slate-300 hover:text-white hover:bg-slate-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'} rounded-md transition-colors"
					onclick={toggleDarkMode}
					aria-label="Toggle dark mode"
					title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
				>
					{#if darkMode}
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path>
						</svg>
					{:else}
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>
						</svg>
					{/if}
				</button>
			</div>
		</div>

		<!-- Search and Actions Bar -->
		<div class="{darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border-b px-6 py-4">
			<div class="flex items-center justify-between gap-4">
				<div class="flex-1 relative max-w-md">
					<input
						type="text"
						bind:value={searchFilter}
						placeholder="Search projects..."
						class="w-full px-4 py-2 pl-10 {darkMode ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-500'} border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
					/>
					<svg class="absolute left-3 top-2.5 w-5 h-5 {darkMode ? 'text-slate-400' : 'text-slate-500'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
					</svg>
					{#if searchFilter}
						<button
							onclick={() => searchFilter = ''}
							class="absolute right-3 top-2.5 p-1 {darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'} rounded transition-colors"
							aria-label="Clear filter"
						>
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
							</svg>
						</button>
					{/if}
				</div>
				<div class="flex items-center gap-2">
					<!-- Email Forwarding Info -->
					<div class="relative">
						<button
							onclick={() => showEmailInfo = !showEmailInfo}
							onmouseleave={() => showEmailInfo = false}
							class="p-2 {darkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'} rounded-lg transition-colors relative"
							aria-label="Email forwarding information"
							title="Email forwarding information"
						>
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
							</svg>
						</button>
						{#if showEmailInfo}
							<div
								class="absolute right-0 top-full mt-2 w-80 {darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border rounded-lg shadow-xl p-4 z-50"
								onmouseenter={() => showEmailInfo = true}
								onmouseleave={() => showEmailInfo = false}
							>
								<div class="flex items-start gap-3">
									<div class="w-8 h-8 flex-shrink-0 {darkMode ? 'bg-indigo-900' : 'bg-indigo-100'} rounded-lg flex items-center justify-center">
										<svg class="w-4 h-4 {darkMode ? 'text-indigo-300' : 'text-indigo-600'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
										</svg>
									</div>
									<div class="flex-1 min-w-0">
										<h4 class="text-sm font-semibold {darkMode ? 'text-white' : 'text-slate-900'} mb-1">Email Documents</h4>
										<p class="text-xs {darkMode ? 'text-slate-400' : 'text-slate-600'} mb-2">
											Forward documents to your personalized email address for automated pipeline analysis.
										</p>
										<div class="flex items-center gap-2 p-2 {darkMode ? 'bg-slate-700' : 'bg-slate-50'} rounded border {darkMode ? 'border-slate-600' : 'border-slate-200'}">
											<code class="text-xs font-mono {darkMode ? 'text-indigo-300' : 'text-indigo-600'} break-all">
												{pipelineEmail}
											</code>
											<button
												onclick={(e) => {
													e.stopPropagation();
													navigator.clipboard.writeText(pipelineEmail);
													// Could add a toast notification here
												}}
												class="p-1 {darkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-600' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200'} rounded transition-colors flex-shrink-0"
												title="Copy email address"
											>
												<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
												</svg>
											</button>
										</div>
									</div>
								</div>
							</div>
						{/if}
					</div>
					<button
						onclick={createNewProjectHandler}
						class="px-4 py-2 text-sm font-medium {darkMode ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-indigo-600 hover:bg-indigo-700'} text-white rounded-lg transition-colors flex items-center gap-2 shadow-sm hover:shadow-md"
					>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
						</svg>
						Add Project
					</button>
				</div>
			</div>
		</div>

		<!-- Projects List -->
		<div class="flex-1 overflow-y-auto {darkMode ? 'bg-slate-900' : 'bg-slate-50'}">
			<div class="px-6 py-6">
				{#if filteredProjects.length > 0}
					<div class="space-y-3">
						{#each filteredProjects as project}
							<div
								class="{darkMode ? 'bg-slate-800 border-slate-700 hover:border-indigo-500' : 'bg-white border-slate-200 hover:border-indigo-300'} border rounded-lg p-4 transition-all hover:shadow-lg group"
							>
								<div class="flex items-center justify-between">
									<a
										href={`/projects/workspace/${project.id}/get-started`}
										class="flex-1 flex items-center gap-4 group/link"
									>
										<div class="w-12 h-12 flex-shrink-0 {darkMode ? 'bg-indigo-900' : 'bg-indigo-100'} rounded-lg flex items-center justify-center">
											<svg class="w-6 h-6 {darkMode ? 'text-indigo-300' : 'text-indigo-600'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
											</svg>
										</div>
										<div class="flex-1 min-w-0">
											<h3 class="text-base font-semibold {darkMode ? 'text-white' : 'text-slate-900'} mb-1 group-hover/link:text-indigo-400 transition-colors">
												{project.name}
											</h3>
											{#if project.description}
												<p class="text-sm {darkMode ? 'text-slate-400' : 'text-slate-600'} line-clamp-2">
													{project.description}
												</p>
											{/if}
										</div>
										<svg class="w-5 h-5 {darkMode ? 'text-slate-500 group-hover/link:text-indigo-400' : 'text-slate-400 group-hover/link:text-indigo-600'} transition-colors flex-shrink-0 opacity-0 group-hover/link:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
										</svg>
									</a>
									<button
										onclick={() => ((current_project = project), (openDelete = true))}
										class="ml-4 p-2 {darkMode ? 'text-slate-400 hover:text-red-400 hover:bg-red-900/20' : 'text-slate-400 hover:text-red-600 hover:bg-red-50'} rounded-lg transition-colors opacity-0 group-hover:opacity-100"
										aria-label="Delete project"
										title="Delete project"
									>
										<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
										</svg>
									</button>
								</div>
							</div>
						{/each}
					</div>
				{:else if searchFilter}
					<div class="text-center py-12">
						<svg class="w-16 h-16 mx-auto {darkMode ? 'text-slate-600' : 'text-slate-300'} mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
						</svg>
						<p class="text-base font-medium {darkMode ? 'text-slate-300' : 'text-slate-700'} mb-2">No projects found</p>
						<p class="text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'}">Try adjusting your search terms</p>
					</div>
				{:else}
					<div class="text-center py-12">
						<div class="w-16 h-16 mx-auto {darkMode ? 'bg-slate-800' : 'bg-slate-100'} rounded-lg flex items-center justify-center mb-4">
							<svg class="w-8 h-8 {darkMode ? 'text-slate-400' : 'text-slate-500'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
							</svg>
						</div>
						<p class="text-base font-medium {darkMode ? 'text-slate-300' : 'text-slate-700'} mb-2">No projects yet</p>
						<p class="text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'} mb-4">Create your first project to get started</p>
						<button
							onclick={createNewProjectHandler}
							class="px-4 py-2 text-sm font-medium {darkMode ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-indigo-600 hover:bg-indigo-700'} text-white rounded-lg transition-colors inline-flex items-center gap-2"
						>
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
							</svg>
							Create Your First Project
						</button>
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>

<!-- Modals -->
<ProjectModal bind:open={openProject} data={current_project} {idToken} />
<DeleteModal bind:open={openDelete} data={current_project} {idToken} mutation={M_DELETE_PROJECT} />
