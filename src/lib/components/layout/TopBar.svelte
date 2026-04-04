<script lang="ts">
	import type { Project } from '@stratiqai/types-simple';
	import type { Snippet } from 'svelte';
	import ProjectSwitcher from '$lib/dashboard/components/ProjectSwitcher.svelte';
	import NotificationBell from './NotificationBell.svelte';
	import { darkModeStore } from '$lib/stores/darkMode.svelte';
	import { globalProjectStore } from '$lib/stores/globalProjectStore.svelte';

	interface Props {
		pageTitle: string;
		/** Static project name (readonly display, no dropdown) */
		projectName?: string;
		/** Override the global project list (rarely needed) */
		projects?: Project[];
		/** Override the global selected project (rarely needed) */
		selectedProjectId?: string | null;
		/**
		 * Custom handler called AFTER the global store is updated.
		 * Use for page-specific side effects (e.g. reinitializing dashboard).
		 */
		onProjectChange?: (projectId: string | null) => void;
		/** Auth token for mutations (rename) inside the project switcher */
		idToken?: string | null;
		subtitle?: string;
		tabs?: Snippet;
		actions?: Snippet;
		notificationBellProps?: { projects?: Project[]; projectName?: string };
	}

	let {
		pageTitle,
		projectName,
		projects,
		selectedProjectId,
		onProjectChange,
		idToken,
		subtitle,
		tabs,
		actions,
		notificationBellProps = {}
	}: Props = $props();

	let darkMode = $derived.by(() => darkModeStore.darkMode);

	const resolvedProjects = $derived(projects ?? globalProjectStore.projects);
	const resolvedSelectedId = $derived(selectedProjectId ?? globalProjectStore.selectedProjectId);

	function handleProjectChange(id: string | null) {
		globalProjectStore.setSelectedProjectId(id);
		onProjectChange?.(id);
	}

	const showProjectSwitcher = $derived(resolvedProjects.length > 0);
	const showProjectName = $derived(!showProjectSwitcher && !!projectName);
</script>

<header
	class="unified-topbar flex h-12 shrink-0 items-center gap-3 border-b px-4 sm:px-5
		{darkMode
		? 'bg-slate-800 border-slate-700/60 shadow-sm shadow-black/20'
		: 'bg-white border-slate-200/80 shadow-sm'}"
>
	<!-- LEFT: Accent bar + page title -->
	<div class="flex items-center gap-2.5 shrink-0 min-w-0">
		<div class="w-1 h-6 shrink-0 rounded-full {darkMode ? 'bg-indigo-500' : 'bg-indigo-600'}"></div>
		<h1
			class="text-sm font-semibold whitespace-nowrap shrink-0 {darkMode ? 'text-white' : 'text-slate-900'}"
		>
			{pageTitle}
		</h1>
	</div>

	{#if subtitle}
		<div class="h-5 w-px shrink-0 {darkMode ? 'bg-slate-600/60' : 'bg-slate-200'}"></div>
		<span class="text-xs whitespace-nowrap {darkMode ? 'text-slate-400' : 'text-slate-500'}">
			{subtitle}
		</span>
	{/if}

	<!-- Project context -->
	{#if showProjectSwitcher}
		<div class="h-5 w-px shrink-0 {darkMode ? 'bg-slate-600/60' : 'bg-slate-200'}"></div>
		<ProjectSwitcher
			projects={resolvedProjects}
			selectedProjectId={resolvedSelectedId}
			{darkMode}
			{idToken}
			onProjectChange={handleProjectChange}
		/>
	{:else if showProjectName}
		<div class="h-5 w-px shrink-0 {darkMode ? 'bg-slate-600/60' : 'bg-slate-200'}"></div>
		<span
			class="text-sm truncate max-w-[200px] {darkMode ? 'text-slate-300' : 'text-slate-600'}"
		>
			{projectName}
		</span>
	{/if}

	<!-- Tabs slot (after project context, separated by divider) -->
	{#if tabs}
		<div class="h-5 w-px shrink-0 {darkMode ? 'bg-slate-600/60' : 'bg-slate-200'}"></div>
		<div class="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto">
			{@render tabs()}
		</div>
	{/if}

	<!-- RIGHT: Page actions + notification bell -->
	<div class="ml-auto flex items-center gap-1 shrink-0">
		{#if actions}
			{@render actions()}
			<div class="h-4 w-px mx-0.5 {darkMode ? 'bg-slate-600/60' : 'bg-slate-200'}"></div>
		{/if}
		<NotificationBell {...notificationBellProps} />
	</div>
</header>
