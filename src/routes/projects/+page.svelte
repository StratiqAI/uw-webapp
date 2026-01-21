<script lang="ts">
	// ----------------------------------------------------------------------------
	// Imports
	// ----------------------------------------------------------------------------

	// Logging Section
	import { logger } from '$lib/logging/debug';

	// Environment Section
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';

	// Realtime Section
	import { ProjectSyncManager, store } from '$lib/realtime/websocket/projectSync';
	import { addSubscription, removeSubscription } from '$lib/stores/appSyncClientStore';
	import { notificationStore, type Notification } from '$lib/stores/notifications.svelte';

	// Types Section
	import type { PageProps } from './$types';
	import type { Project } from '@stratiqai/types-simple';
	import { M_CREATE_PROJECT, M_DELETE_PROJECT, S_ON_CREATE_NOTIFICATION } from '@stratiqai/types-simple';
	import { print } from 'graphql';

	// Dark Mode Section
	import { darkModeStore } from '$lib/stores/darkMode.svelte';

	// Components
	import DeleteModal from '$lib/components/Dialog/DeleteModal.svelte';
	import ProjectModal from './ProjectModal.svelte';
	import MetaTag from './MetaTag.svelte';
	import NotificationBell from '$lib/components/Notifications/NotificationBell.svelte';
	import { gql } from '$lib/realtime/graphql/requestHandler';

	// ----------------------------------------------------------------------------
	// Props + Core Reactive State
	// ----------------------------------------------------------------------------
	const { data } = $props();
	const serverProjects = $derived((data?.items ?? []) as Project[]);
	const nextToken = $derived(data?.nextToken);
	const idToken = $derived(data?.idToken);
	const scope = $derived(data?.scope);
	const currentUser = $derived(data?.currentUser);
	const currentScope = $derived(scope || 'OWNED_BY_ME');
	let darkMode = $derived.by(() => darkModeStore.darkMode);
	const toggleDarkMode = darkModeStore.toggle;

	// Manager lifecycle + UI state
	let projectSyncManager = $state(ProjectSyncManager.createInactive());

	// UI State
	let openProject = $state(false);
	let openDelete = $state(false);
	let current_project: any = $state({});
	let showEmailInfo = $state(false);
	let errorMsg = $state<string | null>(null);

	// ----------------------------------------------------------------------------
	// Store-backed UI Data
	// ----------------------------------------------------------------------------
	function isValidProject(value: unknown): value is Project {
		return typeof value === 'object' && value !== null && 'id' in value && 'name' in value;
	}

	function matchesSearch(project: Project, searchLower: string): boolean {
		return !!(
			project.name?.toLowerCase().includes(searchLower) ||
			project.description?.toLowerCase().includes(searchLower)
		);
	}

	// Get projects from store (reactive to store changes)
	const storeProjects = $derived.by(() =>
		store.getAllAtArray<Project>('projects', {
			filter: (_key, value) => isValidProject(value)
		})
	);

	// Track hydration: once store has data, never fall back to server defaults
	let storeHydrated = $state(false);
	$effect(() => {
		if (!storeHydrated && storeProjects.length > 0) {
			storeHydrated = true;
		}
	});

	// Use store projects once hydrated, otherwise use server projects
	const allProjects = $derived(storeHydrated ? storeProjects : serverProjects);

	// Search and filter
	let searchFilter = $state('');
	const projects = $derived.by(() => {
		if (!searchFilter) return allProjects;
		const searchLower = searchFilter.toLowerCase();
		return allProjects.filter((project) => matchesSearch(project, searchLower));
	});

	// ----------------------------------------------------------------------------
	// Utilities
	// ----------------------------------------------------------------------------
	const pipelineEmail = $derived(
		currentUser?.email
			? `${currentUser.email.split('@')[0]}-pipeline@stratiqai.com`
			: 'your-email-pipeline@stratiqai.com'
	);

	const metaTags = {
		path: '/projects',
		description: 'My StratiqAI Projects',
		title: 'My StratiqAI Projects',
		subtitle: 'My StratiqAI Projects'
	};

	async function createNewProjectHandler(e: Event) {
		e.preventDefault();
		errorMsg = null;

		try {
			const res = await gql<{ createProject: Project }>(
				print(M_CREATE_PROJECT),
				{ input: { name: 'New Project', sharingMode: 'PRIVATE' } },
				idToken
			);

			if (!res.createProject?.id) {
				errorMsg = 'Error creating project: No project returned';
				return;
			}

			await goto(`/projects/workspace/${res.createProject.id}/get-started`);
		} catch (err) {
			console.error('Error creating new project:', err);
			errorMsg = 'Error creating new project';
		}
	}

	// ----------------------------------------------------------------------------
	// Manager Lifecycle
	// ----------------------------------------------------------------------------
	// Initialize manager and sync projects
	$effect(() => {
		let aborted = false;

		async function initializeAndSync() {
			if (!browser || !idToken) return;

			try {
				const hasInitialItems = serverProjects.length > 0;
				await projectSyncManager.initialize({
					idToken,
					initialItems: hasInitialItems ? serverProjects : [],
					setupSubscriptions: true,
					clearExisting: false
				});

				if (aborted || !projectSyncManager.isReady) return;

				// Only sync from API if we didn't have initial items
				if (!hasInitialItems) {
					await projectSyncManager.syncList({
						queryVariables: { limit: 50, scope: currentScope },
						setupSubscriptions: true,
						clearExisting: false
					});
				}
			} catch (err) {
				if (aborted) return;
				console.error('Error initializing project sync:', err);
			}
		}

		initializeAndSync();

		return () => {
			aborted = true;
			projectSyncManager.cleanup();
		};
	});

	// Re-sync when scope changes (after initial load)
	$effect(() => {
		if (!browser || !projectSyncManager.isReady || !idToken) return;

		projectSyncManager.syncList({
			queryVariables: { limit: 50, scope: currentScope },
			setupSubscriptions: true,
			clearExisting: true
		}).catch((err) => {
			console.error('Error syncing projects for scope:', err);
		});
	});

	// Set up notification subscriptions for all projects
	$effect(() => {
		if (!browser || !idToken || !projects.length) return;

		const subscriptions: Array<{
			query: string;
			variables: { parentId: string };
			path: string;
			next: (notification: Notification) => void;
			error: (err: unknown) => void;
		}> = [];

		// Subscribe to notifications for each project
		projects.forEach((project) => {
			const spec = {
				query: print(S_ON_CREATE_NOTIFICATION),
				variables: { parentId: project.id },
				path: 'onCreateNotification',
				next: (notification: Notification) => {
					console.log('Notification received for project:', project.id, notification);
					notificationStore.addNotification(notification);
				},
				error: (err: unknown) => {
					console.error('Notification subscription error for project', project.id, err);
				}
			};
			subscriptions.push(spec);
			addSubscription(idToken, spec).catch((err) => {
				console.error('Failed to add notification subscription for project', project.id, err);
			});
		});

		// Cleanup: remove all subscriptions when projects change or component unmounts
		return () => {
			subscriptions.forEach((spec) => {
				removeSubscription(spec);
			});
		};
	});
</script>

<MetaTag {...metaTags} />

<div
	class="flex h-screen w-full overflow-hidden {darkMode
		? 'bg-slate-900'
		: 'bg-slate-50'} transition-colors"
>
	<!-- Main Content Area -->
	<div class="flex flex-1 flex-col overflow-hidden {darkMode ? 'bg-slate-900/80' : 'bg-primary-50/40'}">
		<!-- Header -->
		<div
			class="glass-surface h-14 {darkMode
				? 'border-primary-800/30 bg-gradient-to-r from-slate-800 via-primary-900/20 to-slate-800'
				: 'border-primary-200/60 bg-gradient-to-r from-primary-50/80 via-white to-primary-50/60'} flex items-center justify-between border-b px-6 shadow-sm"
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
					{projects.length}
					{projects.length === 1 ? 'project' : 'projects'}
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
						class="glass-surface w-full px-4 py-2 pl-10 {darkMode
							? 'border-slate-600/50 text-white placeholder-slate-400'
							: 'border-primary-200/60 text-slate-900 placeholder-slate-500'} rounded-lg border transition-all focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-400/30 shadow-sm"
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
					<div
						class="flex items-center gap-2 rounded-lg border {darkMode
							? 'border-slate-700 bg-slate-800'
							: 'border-slate-200 bg-white'} p-1"
					>
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
							disabled
							class="px-3 py-1.5 text-xs font-medium rounded transition-colors cursor-not-allowed opacity-50 {darkMode
								? 'text-slate-500'
								: 'text-slate-400'}"
							title="Team Projects (disabled)"
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
		<div class="flex-1 overflow-y-auto {darkMode ? 'bg-slate-900/80' : 'bg-primary-50/40'}">
			<div class="px-6 py-6">
				{#if projects.length > 0}
					<div class="space-y-3">
						{#each projects as project (project.id)}
							<div
								class="card-enhanced {darkMode
									? 'border-slate-700/50'
									: 'border-primary-200/60'} group rounded-xl border p-5"
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
<DeleteModal
	bind:open={openDelete}
	data={current_project}
	{idToken}
	mutation={print(M_DELETE_PROJECT)}
/>
