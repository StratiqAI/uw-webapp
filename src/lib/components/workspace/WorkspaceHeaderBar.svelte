<script lang="ts">
	import { ui } from '$lib/stores/ui.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { darkModeStore } from '$lib/stores/darkMode.svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import TabButton from '$lib/components/ui/TabButton.svelte';
	import { gql } from '$lib/realtime/graphql/requestHandler';
	import { M_UPDATE_PROJECT } from '@stratiqai/types-simple';
	import { print } from 'graphql';
	import type { Project } from '@stratiqai/types-simple';
	import { setProject } from '$lib/stores/appStateStore';

	import NotificationBellComponent from '$lib/components/Notifications/NotificationBell.svelte';

	interface WorkspaceHeaderBarProps {
		projectName: string;
		project?: Project | null;
		projectId?: string;
		idToken?: string;
		notificationBell?: any; // Svelte component
		notificationBellProps?: { projectName?: string; projects?: Project[] };
	}

	let { 
		projectName, 
		project, 
		projectId, 
		idToken,
		notificationBell = NotificationBellComponent,
		notificationBellProps = {}
	}: WorkspaceHeaderBarProps = $props();

	const NotificationBell = $derived(notificationBell);
	
	// Editable project name state
	let isEditingName = $state(false);
	let editedName = $state('');
	let isSaving = $state(false);

	// Keep edited name in sync with the prop (including first run)
	$effect(() => {
		editedName = projectName;
	});

	// Handle saving the project name
	async function saveProjectName() {
		if (!project || !projectId || !idToken || !editedName.trim() || editedName === project.name) {
			isEditingName = false;
			editedName = projectName;
			return;
		}

		isSaving = true;
		try {
			const res = await gql<{ updateProject: Project }>(
				print(M_UPDATE_PROJECT),
				{
					id: projectId,
					input: {
						name: editedName.trim()
					}
				},
				idToken
			);

			if (res.updateProject) {
				// Update the project store
				setProject(res.updateProject);
				isEditingName = false;
			}
		} catch (error) {
			console.error('Failed to update project name:', error);
			alert('Failed to update project name. Please try again.');
			editedName = projectName; // Revert on error
		} finally {
			isSaving = false;
		}
	}

	function cancelEdit() {
		editedName = projectName;
		isEditingName = false;
	}

	function handleNameClick() {
		if (project && projectId && idToken) {
			isEditingName = true;
			// Focus the input after it's rendered
			setTimeout(() => {
				const input = document.getElementById('project-name-input') as HTMLInputElement;
				input?.focus();
				input?.select();
			}, 0);
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			event.preventDefault();
			saveProjectName();
		} else if (event.key === 'Escape') {
			event.preventDefault();
			cancelEdit();
		}
	}

	let darkMode = $derived.by(() => darkModeStore.darkMode);

	// Get current route to determine active tab and page title
	const currentPath = $derived($page.url.pathname);
	
	// Get base workspace path (everything up to and including the projectId)
	const workspaceBasePath = $derived.by(() => {
		const parts = currentPath.split('/');
		const workspaceIndex = parts.indexOf('workspace');
		if (workspaceIndex !== -1 && workspaceIndex + 2 < parts.length) {
			// Return path up to projectId: /projects/workspace/[projectId]
			// workspaceIndex = 2, projectId is at index 3, so slice(0, 4) includes indices 0-3
			return parts.slice(0, workspaceIndex + 2).join('/');
		}
		// If we're at the workspace root (no projectId yet), return up to workspace
		if (workspaceIndex !== -1) {
			return parts.slice(0, workspaceIndex + 1).join('/');
		}
		return '';
	});

	// Map routes to page titles
	const pageTitle = $derived.by(() => {
		if (currentPath.includes('get-started')) return 'Get Started';
		if (currentPath.includes('document-analysis')) return 'Document Analysis';
		if (currentPath.includes('deal-room')) return 'Deal Room';
		if (currentPath.includes('financial-analysis')) return 'Financial Analysis';
		if (currentPath.includes('investment-analysis')) return 'Investment Analysis';
		return 'Workspace';
	});

	// Tab navigation items
	const tabs = [
		{ href: 'get-started', label: 'Get Started' },
		{ href: 'document-analysis', label: 'Document Analysis' },
		{ href: 'deal-room', label: 'Deal Room' },
		{ href: 'financial-analysis', label: 'Financial Analysis' }
	];

	// Check if a tab is active
	const isActive = (href: string) => {
		return currentPath === `${workspaceBasePath}/${href}` ||
		       (href === 'get-started' && currentPath === workspaceBasePath) ||
		       (href === 'deal-room' && currentPath.startsWith(`${workspaceBasePath}/deal-room`)) ||
		       (href === 'financial-analysis' && currentPath.startsWith(`${workspaceBasePath}/financial-analysis`));
	};

	// Get current active tab for dropdown
	const activeTab = $derived.by(() => {
		for (const tab of tabs) {
			if (isActive(tab.href)) {
				return tab.href === 'get-started' ? workspaceBasePath : `${workspaceBasePath}/${tab.href}`;
			}
		}
		// Default to get-started if no match
		return workspaceBasePath;
	});

	// Handle dropdown change
	function handleDropdownChange(event: Event) {
		const select = event.target as HTMLSelectElement;
		if (select.value) {
			goto(select.value);
		}
	}
</script>

<div class="sticky top-0 z-10 {darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border-b shadow-sm">
	<!-- Main Header -->
	<div class="h-14 flex items-center justify-between px-3 sm:px-6 {darkMode ? 'bg-gradient-to-r from-slate-800 via-slate-800 to-slate-800' : 'bg-gradient-to-r from-white via-indigo-50/30 to-white'}">
		<div class="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
			<div class="flex items-center gap-2 sm:gap-3">
				<div class="w-1 h-6 sm:h-8 {darkMode ? 'bg-indigo-500' : 'bg-indigo-600'} rounded-full flex-shrink-0"></div>
				<h1 class="text-lg sm:text-xl md:text-2xl font-semibold {darkMode ? 'text-white' : 'text-slate-900'} tracking-tight truncate">
					<span class="{darkMode ? 'text-indigo-400' : 'text-indigo-600'}">{pageTitle}</span>
				</h1>
			</div>
			<!-- Divider - hidden on mobile -->
			<div class="hidden sm:block h-4 w-px {darkMode ? 'bg-slate-700' : 'bg-slate-200'} flex-shrink-0"></div>
			<!-- Project name - hidden on small screens, shown on md+, editable -->
			{#if isEditingName}
				<div class="hidden md:flex items-center gap-2 flex-1 min-w-0">
					<input
						id="project-name-input"
						type="text"
						bind:value={editedName}
						onkeydown={handleKeydown}
						onblur={saveProjectName}
						disabled={isSaving}
						class="px-2 py-1 text-sm rounded border-2 min-w-0 flex-1 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 {darkMode 
							? 'bg-slate-700 border-indigo-500 text-white focus:ring-indigo-400 focus:border-indigo-400 disabled:opacity-50' 
							: 'bg-white border-indigo-300 text-slate-900 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50'}"
						placeholder="Project name"
					/>
					<button
						onclick={saveProjectName}
						disabled={isSaving}
						class="p-1 {darkMode 
							? 'text-green-400 hover:text-green-300 hover:bg-green-900/20' 
							: 'text-green-600 hover:text-green-700 hover:bg-green-50'} rounded transition-colors disabled:opacity-50"
						title="Save"
						aria-label="Save project name"
					>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
						</svg>
					</button>
					<button
						onclick={cancelEdit}
						disabled={isSaving}
						class="p-1 {darkMode 
							? 'text-red-400 hover:text-red-300 hover:bg-red-900/20' 
							: 'text-red-600 hover:text-red-700 hover:bg-red-50'} rounded transition-colors disabled:opacity-50"
						title="Cancel"
						aria-label="Cancel editing project name"
					>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
						</svg>
					</button>
				</div>
			{:else}
				<button
					onclick={handleNameClick}
					class="hidden md:inline-flex items-center gap-1.5 text-sm {darkMode ? 'text-slate-300' : 'text-slate-600'} truncate max-w-xs px-2 py-1 rounded transition-all group"
					title={project && projectId && idToken ? "Click to edit project name" : projectName}
				>
					<span class="group-hover:text-indigo-400 dark:group-hover:text-indigo-400 transition-colors border-b border-transparent group-hover:border-indigo-400 dark:group-hover:border-indigo-400">
						{projectName}
					</span>
					{#if project && projectId && idToken}
						<svg 
							class="w-3.5 h-3.5 opacity-0 group-hover:opacity-70 transition-opacity flex-shrink-0 {darkMode ? 'text-indigo-400' : 'text-indigo-600'}" 
							fill="none" 
							stroke="currentColor" 
							viewBox="0 0 24 24"
						>
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
						</svg>
					{/if}
				</button>
			{/if}
		</div>
		<div class="flex items-center gap-1 sm:gap-2 flex-shrink-0">
			<!-- Notifications Bell -->
			<NotificationBell {...notificationBellProps} />
			<!-- Help button - hidden on mobile, shown on sm+ -->
			<div class="hidden sm:block">
				<Button href="/support" icon>Help & Documentation</Button>
			</div>
			<!-- Show AI button - always visible but text hidden on mobile -->
			<Button onclick={() => ui.setOpen(!ui.sidebarOpen)} className="px-2 sm:px-4">
				<span class="hidden sm:inline">{ui.sidebarOpen ? 'Hide StratiqAI' : 'Show StratiqAI'}</span>
				<span class="sm:hidden text-xs">AI</span>
			</Button>
		</div>
	</div>

	<!-- Tab Navigation -->
	<div class="h-auto min-h-[3rem] border-t {darkMode ? 'border-slate-700 bg-gradient-to-r from-slate-800 via-slate-800 to-slate-800' : 'border-slate-200 bg-gradient-to-r from-slate-50 via-indigo-50/40 to-slate-50'} px-3 sm:px-6 py-2">
		<!-- Dropdown for small screens -->
		<div class="md:hidden">
			<select
				value={activeTab}
				onchange={handleDropdownChange}
				class="w-full px-3 py-2 text-sm rounded-lg border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 {darkMode 
					? 'bg-slate-700 border-indigo-500 text-white focus:ring-indigo-400 focus:border-indigo-400' 
					: 'bg-white border-indigo-200 text-slate-900 focus:ring-indigo-500 focus:border-indigo-500'}"
			>
				{#each tabs as tab}
					{@const tabHref = tab.href === 'get-started' ? workspaceBasePath : `${workspaceBasePath}/${tab.href}`}
					<option value={tabHref}>
						{tab.label}
					</option>
				{/each}
			</select>
		</div>

		<!-- Tab buttons for larger screens -->
		<div class="hidden md:flex items-center gap-1 overflow-x-auto scrollbar-hide">
			{#each tabs as tab}
				{@const tabHref = tab.href === 'get-started' ? workspaceBasePath : `${workspaceBasePath}/${tab.href}`}
				<TabButton 
					href={tabHref}
					className={`flex-shrink-0 ${isActive(tab.href) 
						? (darkMode 
							? 'text-white bg-indigo-600 hover:bg-indigo-700 border-indigo-500 shadow-sm' 
							: 'text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border-indigo-200 font-semibold shadow-sm')
						: (darkMode
							? 'text-slate-400 hover:text-indigo-400 hover:bg-indigo-900/20 hover:border-indigo-700/30'
							: 'text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/50 hover:border-indigo-200')}`}
				>
					<span class="whitespace-nowrap text-sm">{tab.label}</span>
				</TabButton>
			{/each}
		</div>
	</div>
</div>

<style>
	.scrollbar-hide {
		-ms-overflow-style: none;
		scrollbar-width: none;
	}
	.scrollbar-hide::-webkit-scrollbar {
		display: none;
	}
</style>
