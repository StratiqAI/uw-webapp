<!-- src/routes/(app)/+layout.svelte -->
<script lang="ts">
	import { browser } from '$app/environment';
	import type { LayoutProps } from './$types';
	import { ProjectSyncManager, store } from '$lib/realtime/websocket/projectSync';
	import type { Project, Doclink } from '@stratiqai/types-simple';
	import { logger } from '$lib/logging/debug';
	// Import shared notification store and subscription
	import { notificationStore, S_ON_CREATE_NOTIFICATION, type Notification } from '$lib/stores/notifications.svelte';
	// ----------------------------------------------------------------------------
	// Props + Core Reactive State
	// ----------------------------------------------------------------------------
	let { children, data }: LayoutProps = $props();

	// Auth + UI theme
	let currentUser = $derived(data.currentUser);
	const idToken = $derived(data?.idToken);
	const isDarkMode = $derived(darkModeStore.darkMode);
	let isNewProject = $derived(data.isNewProject);
	const projectFromServer = $derived(data.project ?? null);
	const projectId = $derived(projectFromServer?.id ?? null);

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

	// Current project based on route id
	let project = $derived.by(() => {
		if (!projectId) return null;
		const match = projects.find((entry: { id: string; data: Project }) => entry.data?.id === projectId);
		return match?.data ?? null;
	});

	// ----------------------------------------------------------------------------
	// Manager Lifecycle
	// ----------------------------------------------------------------------------
	$effect(() => {
		console.log("+++++++++++++++++++++++++++++++++++++++++++++++++++++++++")

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
	
	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	// Application Svelte Components Section
	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-

	// Import Application Svelte Components
	import { ui } from '$lib/stores/ui.svelte';
	import RightChatDrawer from '$lib/components/RightChatDrawer.svelte';
	import WorkspaceHeaderBar from '$lib/components/workspace/WorkspaceHeaderBar.svelte';
	import { darkModeStore } from '$lib/stores/darkMode.svelte';
	import NotificationBell from '$lib/components/Notifications/NotificationBell.svelte';
</script>

<!-- Full viewport split: main app + right chat drawer -->
<div
	class="flex min-h-[100svh] w-full {darkModeStore.darkMode ? 'bg-slate-900' : 'bg-slate-50'} text-gray-900"
	style={`padding-right:${ui.sidebarOpen ? ui.sidebarWidth : 0}px`}
>
	<!-- Main app area -->
	<div class="flex w-full min-w-0 flex-1 flex-col">
		<WorkspaceHeaderBar
			projectName={project?.name ?? projectFromServer?.name ?? (isNewProject ? 'New Project' : 'Loading...')}
			project={project ?? projectFromServer}
			projectId={projectFromServer?.id ?? project?.id}
			idToken={data.idToken}
			notificationBellProps={{ projectName: project?.name ?? projectFromServer?.name }}
		/>

		<div class="flex-1 overflow-auto {darkModeStore.darkMode ? 'bg-slate-900' : 'bg-slate-50'}">
			{@render children()}
		</div>
	</div>

	<!-- Right chat drawer which will contain the chatbot -->
	<RightChatDrawer />
</div>
