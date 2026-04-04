<script lang="ts">
	// ----------------------------------------------------------------------------
	// Imports
	// ----------------------------------------------------------------------------
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';

	import { addSubscription, removeSubscription } from '$lib/stores/appSyncClientStore';
	import {
		notificationStore,
		S_ON_CREATE_NOTIFICATION,
		type Notification
	} from '$lib/stores/notifications.svelte';

	import type { Project } from '@stratiqai/types-simple';
	import {
		M_CREATE_PROJECT,
		M_DELETE_PROJECT,
		S_ON_CREATE_PROJECT,
		S_ON_DELETE_PROJECT
	} from '@stratiqai/types-simple';
	import { print } from 'graphql';

	import { darkModeStore } from '$lib/stores/darkMode.svelte';
	import { toastStore } from '$lib/stores/toastStore.svelte';

	import DeleteModal from '$lib/components/ui/DeleteModal.svelte';
	import ProjectModal from './ProjectModal.svelte';
	import ProjectCard from './ProjectCard.svelte';
	import MetaTag from './MetaTag.svelte';
	import TopBar from '$lib/components/layout/TopBar.svelte';
	import { gql } from '$lib/services/realtime/graphql/requestHandler';

	// ----------------------------------------------------------------------------
	// Props + Core Reactive State
	// ----------------------------------------------------------------------------
	const { data } = $props();
	const idToken = $derived(data?.idToken);
	const currentUser = $derived(data?.currentUser);
	const currentScope = $derived(data?.scope || 'OWNED_BY_ME');
	let darkMode = $derived.by(() => darkModeStore.darkMode);

	// Server-loaded projects (refreshed by SvelteKit on navigation / scope change)
	const serverItems = $derived((data?.items ?? []) as Project[]);

	// Local projects list — seeded from the server, kept current by subscriptions
	let allProjects = $state<Project[]>([]);

	// Sync from server before DOM paint (initial load + scope change)
	$effect.pre(() => {
		allProjects = serverItems;
	});

	// UI State
	let openProject = $state(false);
	let openDelete = $state(false);
	let current_project: any = $state({});
	let showEmailInfo = $state(false);
	let errorMsg = $state<string | null>(null);

	// Search and filter
	let searchFilter = $state('');
	const projects = $derived.by(() => {
		if (!searchFilter) return allProjects;
		const searchLower = searchFilter.toLowerCase();
		return allProjects.filter(
			(p) =>
				p.name?.toLowerCase().includes(searchLower) ||
				p.description?.toLowerCase().includes(searchLower)
		);
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
		path: '/p',
		description: 'My StratiqAI Projects',
		title: 'My StratiqAI Projects',
		subtitle: 'My StratiqAI Projects'
	};

	$effect(() => {
		if (!browser) return;
		const reason = $page.url.searchParams.get('reason');
		if (reason === 'project-not-found') {
			toastStore.warning('That project was not found. Please choose a project below.');
			history.replaceState(null, '', '/p');
		} else if (reason === 'project-error') {
			toastStore.warning('There was a problem loading that project. Please choose a project below.');
			history.replaceState(null, '', '/p');
		}

		if ($page.url.searchParams.get('action') === 'new') {
			history.replaceState(null, '', '/p');
			createNewProjectHandler(new Event('click'));
		}
	});

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

			await goto(`/p/${res.createProject.id}/docs`);
		} catch (err) {
			console.error('Error creating new project:', err);
			errorMsg = 'Error creating new project';
		}
	}

	async function handleDeleteConfirm() {
		if (current_project?.id) {
			allProjects = allProjects.filter((p) => p.id !== current_project.id);
		}
	}

	// ----------------------------------------------------------------------------
	// Real-time Subscriptions
	// ----------------------------------------------------------------------------

	// Global "onCreate" subscription — fires when any project is created for this user
	$effect(() => {
		if (!browser || !idToken) return;

		const token = idToken;
		const spec = {
			query: print(S_ON_CREATE_PROJECT),
			variables: {},
			path: 'onCreateProject',
			next: (created: Project) => {
				if (created?.id && !allProjects.some((p) => p.id === created.id)) {
					allProjects = [...allProjects, created];
				}
			},
			error: (err: unknown) => console.error('Project create subscription error:', err)
		};

		addSubscription(token, spec).catch((err) =>
			console.error('Failed to add project create subscription:', err)
		);
		return () => removeSubscription(spec);
	});

	// Per-project "onDelete" subscriptions — remove the project from the list in real-time
	$effect(() => {
		if (!browser || !idToken || !allProjects.length) return;

		const token = idToken;
		const specs = allProjects.map((project) => ({
			query: print(S_ON_DELETE_PROJECT),
			variables: { id: project.id },
			path: 'onDeleteProject',
			next: (deleted: Project) => {
				allProjects = allProjects.filter((p) => p.id !== deleted.id);
			},
			error: (err: unknown) =>
				console.error('Project delete subscription error:', project.id, err)
		}));

		specs.forEach((s) =>
			addSubscription(token, s).catch((err) =>
				console.error('Failed to add project delete subscription:', err)
			)
		);
		return () => specs.forEach((s) => removeSubscription(s));
	});

	// Notification subscriptions for each project
	$effect(() => {
		if (!browser || !idToken || !projects.length) return;

		const token = idToken;
		const specs = projects.map((project) => ({
			query: print(S_ON_CREATE_NOTIFICATION),
			variables: { parentId: project.id },
			path: 'onCreateNotification',
			next: (notification: Notification) => {
				notificationStore.addNotification(notification);
			},
			error: (err: unknown) =>
				console.error('Notification subscription error for project', project.id, err)
		}));

		specs.forEach((s) =>
			addSubscription(token, s).catch((err) =>
				console.error('Failed to add notification subscription:', err)
			)
		);
		return () => specs.forEach((s) => removeSubscription(s));
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
		<TopBar
			pageTitle="Projects"
			{idToken}
			notificationBellProps={{ projects }}
		>
			{#snippet tabs()}
				<div class="relative flex-1 min-w-[120px] max-w-xs">
					<input
						type="text"
						bind:value={searchFilter}
						placeholder="Search projects..."
						class="w-full h-7 px-3 pl-8 text-xs rounded-md border transition-colors focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500
							{darkMode
							? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400'
							: 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'}"
					/>
					<svg class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 {darkMode ? 'text-slate-400' : 'text-slate-400'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
					</svg>
					{#if searchFilter}
						<button
							onclick={() => (searchFilter = '')}
							class="absolute right-2 top-1/2 -translate-y-1/2 {darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-400 hover:text-slate-600'} transition-colors"
							aria-label="Clear filter"
						>
							<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
							</svg>
						</button>
					{/if}
				</div>
			{/snippet}
			{#snippet actions()}
				<!-- Scope Toggle -->
				<div class="flex items-center rounded-md border {darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'} p-0.5">
					<button
						onclick={() => { goto(`/p?scope=OWNED_BY_ME`, { noScroll: true }); }}
						class="px-2 py-0.5 text-[11px] font-medium rounded transition-colors {currentScope === 'OWNED_BY_ME'
							? darkMode ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-700'
							: darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'}"
						title="Show my projects"
					>My Projects</button>
					<button
						disabled
						class="px-2 py-0.5 text-[11px] font-medium rounded transition-colors cursor-not-allowed opacity-50 {darkMode ? 'text-slate-500' : 'text-slate-400'}"
						title="Team Projects (disabled)"
					>Team Projects</button>
				</div>

				<!-- Email Info -->
				<div class="relative">
					<button
						onclick={() => (showEmailInfo = !showEmailInfo)}
						onmouseleave={() => (showEmailInfo = false)}
						class="p-1 rounded transition-colors {darkMode ? 'text-slate-400 hover:bg-slate-700 hover:text-slate-200' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'}"
						aria-label="Email forwarding information"
						title="Email forwarding information"
					>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
						</svg>
					</button>
					{#if showEmailInfo}
						<div
							role="tooltip"
							class="absolute right-0 top-full mt-2 w-80 {darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'} z-50 rounded-lg border p-4 shadow-xl"
							onmouseenter={() => (showEmailInfo = true)}
							onmouseleave={() => (showEmailInfo = false)}
						>
							<div class="flex items-start gap-3">
								<div class="h-8 w-8 shrink-0 {darkMode ? 'bg-indigo-900' : 'bg-indigo-100'} flex items-center justify-center rounded-lg">
									<svg class="h-4 w-4 {darkMode ? 'text-indigo-300' : 'text-indigo-600'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
									</svg>
								</div>
								<div class="min-w-0 flex-1">
									<h4 class="text-sm font-semibold {darkMode ? 'text-white' : 'text-slate-900'} mb-1">Email Documents</h4>
									<p class="text-xs {darkMode ? 'text-slate-400' : 'text-slate-600'} mb-2">Forward documents to your personalized email address for automated pipeline analysis.</p>
									<div class="flex items-center gap-2 p-2 {darkMode ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-200'} rounded border">
										<code class="font-mono text-xs {darkMode ? 'text-indigo-300' : 'text-indigo-600'} break-all">{pipelineEmail}</code>
										<button
											aria-label="Copy email address"
											onclick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(pipelineEmail); }}
											class="p-1 shrink-0 rounded transition-colors {darkMode ? 'text-slate-400 hover:bg-slate-600 hover:text-slate-200' : 'text-slate-500 hover:bg-slate-200 hover:text-slate-700'}"
											title="Copy email address"
										>
											<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
					class="px-2.5 py-1 text-xs font-medium bg-indigo-600 hover:bg-indigo-700 flex items-center gap-1.5 rounded-md text-white shadow-sm transition-colors"
				>
					<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
					</svg>
					Add Project
				</button>
			{/snippet}
		</TopBar>

		<!-- Projects Grid -->
		<div class="flex-1 overflow-y-auto {darkMode ? 'bg-slate-900/80' : 'bg-primary-50/40'}">
			<div class="px-6 py-6">
				{#if projects.length > 0}
					<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
						{#each projects as project (project.id)}
							<ProjectCard
								{project}
								{darkMode}
								{idToken}
								onDelete={(p) => { current_project = p; openDelete = true; }}
							/>
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
							class="px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 inline-flex items-center gap-2 rounded-lg text-white transition-colors"
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
	onConfirm={handleDeleteConfirm}
/>
