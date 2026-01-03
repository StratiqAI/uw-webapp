<script lang="ts">
	import { logger } from '$lib/logging/debug';
	import { darkModeStore } from '$lib/stores/darkMode.svelte';

	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	// Props Section
	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-

	// Import the SvelteKit Types for the Page Properties
	import type { PageProps } from './$types';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';

	// Get the Props for the Component
	let componentProps: PageProps = $props();

	// Get the authenticated current User from the Load Data
	let currentUser = $derived(componentProps.data?.currentUser);

	// Get idToken from server-side load function
	let idToken = componentProps.data.idToken!;
	
	// Get scope from server-side load function (defaults to 'OWNED_BY_ME')
	// This will be updated when the page reloads with a new scope parameter
	let currentScope = $derived(componentProps.data?.scope || 'OWNED_BY_ME');

	// Use unified dark mode store
	let darkMode = $derived.by(() => darkModeStore.darkMode);
	let toggleDarkMode = darkModeStore.toggle;

	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	// Realtime Section
	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-

	// 1. Import public environment variables for GraphQL endpoint and API key
	import { PUBLIC_GRAPHQL_HTTP_ENDPOINT } from '$env/static/public';

	// 2. Import types and operations from the new types library
	import type { Project } from '@stratiqai/types-simple';
	import { M_CREATE_PROJECT, M_DELETE_PROJECT } from '@stratiqai/types-simple';
	import { print } from 'graphql';
	
	// Import shared notification store and subscription
	import { notificationStore, S_ON_CREATE_NOTIFICATION, type Notification } from '$lib/stores/notifications.svelte';

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

		// Create subscriptions for notifications for each project
		const notificationSubscriptions = projects.map((project) => ({
			query: print(S_ON_CREATE_NOTIFICATION),
			variables: { parentId: project.id },
			path: 'onCreateNotification',
			next: (notification: Notification) => {
				console.log('Notification received for project:', project.id, notification);
				// Add notification to the shared store
				notificationStore.addNotification(notification);
			},
			error: (err: any) => console.error('Notification subscription error for project', project.id, err)
		}));

		const client = new AppSyncWsClient({
			graphqlHttpUrl: PUBLIC_GRAPHQL_HTTP_ENDPOINT,
			auth: { mode: 'cognito', idToken },
			subscriptions: [
				...notificationSubscriptions
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
	import NotificationBell from '$lib/components/Notifications/NotificationBell.svelte';

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
			name: 'New Project',
			sharingMode: "PRIVATE"
		};

		try {
			const res = await gql<{ createProject: Project }>(print(M_CREATE_PROJECT), { input }, idToken);
			
			// Check if project was created
			if (!res.createProject) {
				console.error('Project creation returned null project');
				alert('Error creating project: No project returned');
				return;
			}
			
			const projectId = res.createProject.id;
			await goto(`/projects/workspace/${projectId}/get-started`);
		} catch (err) {
			console.error('Error creating new project:', err);
			alert('Error creating new project');
		}
	}
</script>

<MetaTag {path} {description} {title} {subtitle} />

<div
	class="flex h-screen w-full overflow-hidden {darkMode
		? 'bg-slate-900'
		: 'bg-slate-50'} transition-colors"
>
	<!-- Main Content Area -->
	<div class="flex flex-1 flex-col overflow-hidden {darkMode ? 'bg-slate-900' : 'bg-white'}">
		<!-- Header -->
		<div
			class="h-14 {darkMode
				? 'border-slate-700 bg-slate-800'
				: 'border-slate-200 bg-white'} flex items-center justify-between border-b px-6 shadow-sm"
		>
			<div class="flex items-center gap-4">
				<div
					class="h-10 w-10 {darkMode
						? 'bg-indigo-900'
						: 'bg-indigo-100'} flex items-center justify-center rounded-lg"
				>
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
							d="M9 8h10M9 12h10M9 16h10M4.99 8H5m-.02 4h.01m0 4H5"
						></path>
					</svg>
				</div>
				<h1
					class="text-2xl font-semibold {darkMode ? 'text-white' : 'text-slate-900'} tracking-tight"
				>
					Projects
				</h1>
				<div class="h-4 w-px {darkMode ? 'bg-slate-700' : 'bg-slate-200'}"></div>
				<span class="text-sm {darkMode ? 'text-slate-300' : 'text-slate-600'}">
					{filteredProjects.length}
					{filteredProjects.length === 1 ? 'project' : 'projects'}
				</span>
			</div>
			<div class="flex items-center gap-2">
				<!-- Notifications Bell -->
				<NotificationBell {projects} />
				<button
					class="p-2 {darkMode
						? 'text-slate-300 hover:bg-slate-700 hover:text-white'
						: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'} rounded-md transition-colors"
					onclick={toggleDarkMode}
					aria-label="Toggle dark mode"
					title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
				>
					{#if darkMode}
						<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
							></path>
						</svg>
					{:else}
						<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
							></path>
						</svg>
					{/if}
				</button>
			</div>
		</div>

		<!-- Search and Actions Bar -->
		<div
			class="{darkMode
				? 'border-slate-700 bg-slate-800'
				: 'border-slate-200 bg-white'} border-b px-6 py-4"
		>
			<div class="flex items-center justify-between gap-4">
				<div class="relative max-w-md flex-1">
					<input
						type="text"
						bind:value={searchFilter}
						placeholder="Search projects..."
						class="w-full px-4 py-2 pl-10 {darkMode
							? 'border-slate-600 bg-slate-700 text-white placeholder-slate-400'
							: 'border-slate-300 bg-white text-slate-900 placeholder-slate-500'} rounded-lg border transition-colors focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
					/>
					<svg
						class="absolute left-3 top-2.5 h-5 w-5 {darkMode ? 'text-slate-400' : 'text-slate-500'}"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
						></path>
					</svg>
					{#if searchFilter}
						<button
							onclick={() => (searchFilter = '')}
							class="absolute right-3 top-2.5 p-1 {darkMode
								? 'text-slate-400 hover:text-slate-200'
								: 'text-slate-500 hover:text-slate-700'} rounded transition-colors"
							aria-label="Clear filter"
						>
							<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M6 18L18 6M6 6l12 12"
								></path>
							</svg>
						</button>
					{/if}
				</div>
				<div class="flex items-center gap-2">
					<!-- Scope Toggle -->
					<div class="flex items-center gap-2 rounded-lg border {darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'} p-1">
						<button
							onclick={() => {
								goto(`/projects?scope=OWNED_BY_ME`, { noScroll: true });
							}}
							class="px-3 py-1.5 text-xs font-medium rounded transition-colors {currentScope === 'OWNED_BY_ME'
								? darkMode
									? 'bg-indigo-600 text-white'
									: 'bg-indigo-100 text-indigo-700'
								: darkMode
									? 'text-slate-400 hover:text-slate-200'
									: 'text-slate-600 hover:text-slate-900'}"
							title="Show my projects"
						>
							My Projects
						</button>
						<button
							onclick={() => {
								goto(`/projects?scope=ALL_TENANT`, { noScroll: true });
							}}
							class="px-3 py-1.5 text-xs font-medium rounded transition-colors {currentScope === 'ALL_TENANT'
								? darkMode
									? 'bg-indigo-600 text-white'
									: 'bg-indigo-100 text-indigo-700'
								: darkMode
									? 'text-slate-400 hover:text-slate-200'
									: 'text-slate-600 hover:text-slate-900'}"
							title="Show tenant projects"
						>
							Team Projects
						</button>
					</div>
					<!-- Email Forwarding Info -->
					<div class="relative">
						<button
							onclick={() => (showEmailInfo = !showEmailInfo)}
							onmouseleave={() => (showEmailInfo = false)}
							class="p-2 {darkMode
								? 'text-slate-400 hover:bg-slate-700 hover:text-slate-200'
								: 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'} relative rounded-lg transition-colors"
							aria-label="Email forwarding information"
							title="Email forwarding information"
						>
							<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
								></path>
							</svg>
						</button>
						{#if showEmailInfo}
							<div
								role="tooltip"
								class="absolute right-0 top-full mt-2 w-80 {darkMode
									? 'border-slate-700 bg-slate-800'
									: 'border-slate-200 bg-white'} z-50 rounded-lg border p-4 shadow-xl"
								onmouseenter={() => (showEmailInfo = true)}
								onmouseleave={() => (showEmailInfo = false)}
							>
								<div class="flex items-start gap-3">
									<div
										class="h-8 w-8 flex-shrink-0 {darkMode
											? 'bg-indigo-900'
											: 'bg-indigo-100'} flex items-center justify-center rounded-lg"
									>
										<svg
											class="h-4 w-4 {darkMode ? 'text-indigo-300' : 'text-indigo-600'}"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
											></path>
										</svg>
									</div>
									<div class="min-w-0 flex-1">
										<h4
											class="text-sm font-semibold {darkMode
												? 'text-white'
												: 'text-slate-900'} mb-1"
										>
											Email Documents
										</h4>
										<p class="text-xs {darkMode ? 'text-slate-400' : 'text-slate-600'} mb-2">
											Forward documents to your personalized email address for automated pipeline
											analysis.
										</p>
										<div
											class="flex items-center gap-2 p-2 {darkMode
												? 'bg-slate-700'
												: 'bg-slate-50'} rounded border {darkMode
												? 'border-slate-600'
												: 'border-slate-200'}"
										>
											<code
												class="font-mono text-xs {darkMode
													? 'text-indigo-300'
													: 'text-indigo-600'} break-all"
											>
												{pipelineEmail}
											</code>
											<button
												aria-label="Copy email address"
												onclick={(e) => {
													e.stopPropagation();
													navigator.clipboard.writeText(pipelineEmail);
													// Could add a toast notification here
												}}
												class="p-1 {darkMode
													? 'text-slate-400 hover:bg-slate-600 hover:text-slate-200'
													: 'text-slate-500 hover:bg-slate-200 hover:text-slate-700'} flex-shrink-0 rounded transition-colors"
												title="Copy email address"
											>
												<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														stroke-width="2"
														d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
													></path>
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
						class="px-4 py-2 text-sm font-medium {darkMode
							? 'bg-indigo-600 hover:bg-indigo-700'
							: 'bg-indigo-600 hover:bg-indigo-700'} flex items-center gap-2 rounded-lg text-white shadow-sm transition-colors hover:shadow-md"
					>
						<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 4v16m8-8H4"
							></path>
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
								class="{darkMode
									? 'border-slate-700 bg-slate-800 hover:border-indigo-500'
									: 'border-slate-200 bg-white hover:border-indigo-300'} group rounded-lg border p-4 transition-all hover:shadow-lg"
							>
								<div class="flex items-center justify-between">
									<a
										href={`/projects/workspace/${project.id}/get-started`}
										class="group/link flex flex-1 items-center gap-4"
									>
										<div
											class="h-12 w-12 flex-shrink-0 {darkMode
												? 'bg-indigo-900'
												: 'bg-indigo-100'} flex items-center justify-center rounded-lg"
										>
											<svg
												class="h-6 w-6 {darkMode ? 'text-indigo-300' : 'text-indigo-600'}"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
												></path>
											</svg>
										</div>
										<div class="min-w-0 flex-1">
											<h3
												class="text-base font-semibold {darkMode
													? 'text-white'
													: 'text-slate-900'} mb-1 transition-colors group-hover/link:text-indigo-400"
											>
												{project.name}
											</h3>
											{#if project.description}
												<p
													class="text-sm {darkMode
														? 'text-slate-400'
														: 'text-slate-600'} line-clamp-2"
												>
													{project.description}
												</p>
											{/if}
										</div>
										<svg
											class="h-5 w-5 {darkMode
												? 'text-slate-500 group-hover/link:text-indigo-400'
												: 'text-slate-400 group-hover/link:text-indigo-600'} flex-shrink-0 opacity-0 transition-colors group-hover/link:opacity-100"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M9 5l7 7-7 7"
											></path>
										</svg>
									</a>
									<button
										onclick={() => ((current_project = project), (openDelete = true))}
										class="ml-4 p-2 {darkMode
											? 'text-slate-400 hover:bg-red-900/20 hover:text-red-400'
											: 'text-slate-400 hover:bg-red-50 hover:text-red-600'} rounded-lg opacity-0 transition-colors group-hover:opacity-100"
										aria-label="Delete project"
										title="Delete project"
									>
										<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
											></path>
										</svg>
									</button>
								</div>
							</div>
						{/each}
					</div>
				{:else if searchFilter}
					<div class="py-12 text-center">
						<svg
							class="mx-auto h-16 w-16 {darkMode ? 'text-slate-600' : 'text-slate-300'} mb-4"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="1.5"
								d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
							></path>
						</svg>
						<p class="text-base font-medium {darkMode ? 'text-slate-300' : 'text-slate-700'} mb-2">
							No projects found
						</p>
						<p class="text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'}">
							Try adjusting your search terms
						</p>
					</div>
				{:else}
					<div class="py-12 text-center">
						<div
							class="mx-auto h-16 w-16 {darkMode
								? 'bg-slate-800'
								: 'bg-slate-100'} mb-4 flex items-center justify-center rounded-lg"
						>
							<svg
								class="h-8 w-8 {darkMode ? 'text-slate-400' : 'text-slate-500'}"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
								></path>
							</svg>
						</div>
						<p class="text-base font-medium {darkMode ? 'text-slate-300' : 'text-slate-700'} mb-2">
							No projects yet
						</p>
						<p class="text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'} mb-4">
							Create your first project to get started
						</p>
						<button
							onclick={createNewProjectHandler}
							class="px-4 py-2 text-sm font-medium {darkMode
								? 'bg-indigo-600 hover:bg-indigo-700'
								: 'bg-indigo-600 hover:bg-indigo-700'} inline-flex items-center gap-2 rounded-lg text-white transition-colors"
						>
							<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M12 4v16m8-8H4"
								></path>
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
<DeleteModal bind:open={openDelete} data={current_project} {idToken} mutation={print(M_DELETE_PROJECT)} />
