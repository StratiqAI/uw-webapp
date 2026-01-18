<!-- src/routes/(app)/+layout.svelte -->
<script lang="ts">
	// ----------------------------------------------------------------------------
	// Imports
	// ----------------------------------------------------------------------------
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
	import RightChatDrawer from '$lib/components/RightChatDrawer.svelte';
	import WorkspaceHeaderBar from '$lib/components/workspace/WorkspaceHeaderBar.svelte';

	// ----------------------------------------------------------------------------
	// Props + Core Reactive State
	// ----------------------------------------------------------------------------
	let { children, data }: LayoutProps = $props();

	const currentUser = $derived(data.currentUser);
	const idToken = $derived(data?.idToken);
	const isNewProject = $derived(data.isNewProject);
	const projectFromServer = $derived(data.project ?? null);
	const projectId = $derived(projectFromServer?.id ?? null);

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
