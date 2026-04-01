<!-- src/routes/(app)/+layout.svelte -->
<script lang="ts">
	import { browser } from '$app/environment';
	import type { LayoutProps } from './$types';
	import { ProjectSyncManager, store } from '$lib/realtime/websocket/projectSync';
	import { addSubscription, removeSubscription } from '$lib/stores/appSyncClientStore';
	import { notificationStore, S_ON_CREATE_NOTIFICATION, type Notification } from '$lib/stores/notifications.svelte';
	import { darkModeStore } from '$lib/stores/darkMode.svelte';
	import { ui } from '$lib/stores/ui.svelte';
	import type { Project } from '@stratiqai/types-simple';
	import { print } from 'graphql';
	import { logger } from '$lib/logging/debug';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import RightChatDrawer from '$lib/components/RightChatDrawer.svelte';
	import UnifiedTopBar from '$lib/components/UnifiedTopBar.svelte';
	import { globalProjectStore } from '$lib/stores/globalProjectStore.svelte';

	// ----------------------------------------------------------------------------
	// Props + Core Reactive State
	// ----------------------------------------------------------------------------
	let { children, data }: LayoutProps = $props();

	const currentUser = $derived(data.currentUser);
	const idToken = $derived(data?.idToken);
	const isNewProject = $derived(data.isNewProject);
	const projectFromServer = $derived(data.project ?? null);
	const projectId = $derived(projectFromServer?.id ?? null);
	/** URL segment — source of truth for which project this workspace route is for (may exist before client store catches up). */
	const routeProjectId = $derived($page.params.projectId ?? null);

	// Manager lifecycle + UI state
	let projectSyncManager = $state(ProjectSyncManager.createInactive());

	// ----------------------------------------------------------------------------
	// Store-backed UI Data
	// ----------------------------------------------------------------------------
	function isValidProject(value: unknown): value is Project {
		return typeof value === 'object' && value !== null && 'id' in value && 'name' in value;
	}

	// Get projects from store (reactive to store changes)
	const storeProjects = $derived.by(() =>
		store.getAllAtArray<Project>('projects', {
			filter: (_key, value) => isValidProject(value)
		})
	);

	// Current project based on route id
	const project = $derived.by(() => {
		if (!projectId) return null;
		return storeProjects.find((p) => p.id === projectId) ?? null;
	});

	// ----------------------------------------------------------------------------
	// Manager Lifecycle
	// ----------------------------------------------------------------------------
	// Initialize manager and sync projects
	$effect(() => {
		let aborted = false;

		async function initializeAndSync() {
			if (!browser || !idToken) return;

			try {
				// Initialize with server project if available
				const initialItems = projectFromServer ? [projectFromServer] : [];
				await projectSyncManager.initialize({
					idToken,
					initialItems,
					setupSubscriptions: true,
					clearExisting: false
				});

				if (aborted || !projectSyncManager.isReady) return;

				// Only sync from API if we didn't have initial project
				if (!projectFromServer) {
					await projectSyncManager.syncList({
						queryVariables: { limit: 50, scope: 'OWNED_BY_ME' },
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

	// Set up notification subscription for this project
	$effect(() => {
		if (!browser || !idToken || !projectId) return;

		const spec = {
			query: print(S_ON_CREATE_NOTIFICATION),
			variables: { parentId: projectId },
			path: 'onCreateNotification',
			next: (notification: Notification) => {
				console.log('Notification received for project:', projectId, notification);
				notificationStore.addNotification(notification);
			},
			error: (err: unknown) => {
				console.error('Notification subscription error for project', projectId, err);
			}
		};

		addSubscription(idToken, spec).catch((err) => {
			console.error('Failed to add notification subscription for project', projectId, err);
		});

		// Cleanup: remove subscription when project changes or component unmounts
		return () => {
			removeSubscription(spec);
		};
	});

	// Keep global project selection aligned with the workspace URL so the switcher matches the loaded project.
	$effect(() => {
		if (!browser || isNewProject) return;
		const rid = routeProjectId;
		if (!rid) return;
		if (globalProjectStore.selectedProjectId !== rid) {
			globalProjectStore.setSelectedProjectId(rid);
		}
	});

	// ---------- Workspace header logic ----------
	const currentPath = $derived($page.url.pathname);

	const workspaceBasePath = $derived.by(() => {
		const parts = currentPath.split('/');
		const wsIdx = parts.indexOf('workspace');
		if (wsIdx !== -1 && wsIdx + 2 < parts.length) return parts.slice(0, wsIdx + 2).join('/');
		if (wsIdx !== -1) return parts.slice(0, wsIdx + 1).join('/');
		return '';
	});

	const pageTitle = $derived.by(() => {
		if (currentPath.includes('document-analysis')) return 'Document Workspace';
		if (currentPath.includes('deal-room')) return 'Deal Room';
		if (currentPath.includes('financial-analysis')) return 'Financial Analysis';
		if (currentPath.includes('investment-analysis')) return 'Investment Analysis';
		return 'Workspace';
	});

	function handleWorkspaceProjectChange(newProjectId: string | null) {
		if (!newProjectId || newProjectId === routeProjectId) return;
		const subPage = currentPath.replace(workspaceBasePath, '') || '';
		goto(`/projects/workspace/${newProjectId}${subPage}`);
	}
</script>

<!-- Full viewport split: main app + right chat drawer -->
<div
	class="flex min-h-[100svh] w-full {darkModeStore.darkMode ? 'bg-slate-900' : 'bg-slate-50'} text-gray-900"
	style={`padding-right:${ui.sidebarOpen ? ui.sidebarWidth : 0}px`}
>
	<!-- Main app area -->
	<div class="flex w-full min-w-0 flex-1 flex-col">
		<UnifiedTopBar
			{pageTitle}
			selectedProjectId={routeProjectId}
			onProjectChange={handleWorkspaceProjectChange}
			notificationBellProps={{ projectName: project?.name ?? projectFromServer?.name }}
		/>

		<div class="flex-1 overflow-auto {darkModeStore.darkMode ? 'bg-slate-900' : 'bg-slate-50'}">
			{@render children()}
		</div>
	</div>

	<!-- Right chat drawer which will contain the chatbot -->
	<RightChatDrawer />
</div>
