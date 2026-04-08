<script module lang="ts">
	let widgetTemplatesSyncedForProject: string | null = null;
</script>

<script lang="ts">
	import { browser } from '$app/environment';
	import type { LayoutProps } from './$types';
	import { ProjectSyncManager, store } from '$lib/services/realtime/websocket/projectSync';
	import { addSubscription, removeSubscription } from '$lib/stores/appSyncClientStore';
	import { notificationStore, S_ON_CREATE_NOTIFICATION, type Notification } from '$lib/stores/notifications.svelte';
	import { darkModeStore } from '$lib/stores/darkMode.svelte';
	import { ui } from '$lib/stores/ui.svelte';
	import type { Project } from '@stratiqai/types-simple';
	import { print } from 'graphql';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import ChatDrawer from '$lib/components/layout/ChatDrawer.svelte';
	import TopBar from '$lib/components/layout/TopBar.svelte';
	import { globalProjectStore } from '$lib/stores/globalProjectStore.svelte';
	import { GraphQLQueryClient } from '$lib/services/realtime/store/GraphQLQueryClient';
	import { syncWidgetTemplates } from '$lib/services/widgetPromptService';
	import { createLogger } from '$lib/utils/logger';

	const log = createLogger('projects');

	let { children, data }: LayoutProps = $props();

	const currentUser = $derived(data.currentUser);
	const idToken = $derived(data?.idToken);
	const isNewProject = $derived(data.isNewProject);
	const projectFromServer = $derived(data.project ?? null);
	const projectId = $derived(projectFromServer?.id ?? null);
	const routeProjectId = $derived($page.params.projectId ?? null);

	let projectSyncManager = $state(ProjectSyncManager.createInactive());

	function isValidProject(value: unknown): value is Project {
		return typeof value === 'object' && value !== null && 'id' in value && 'name' in value;
	}

	const storeProjects = $derived.by(() =>
		store.getAllAtArray<Project>('projects', {
			filter: (_key, value) => isValidProject(value)
		})
	);

	const project = $derived.by(() => {
		if (!projectId) return null;
		return storeProjects.find((p) => p.id === projectId) ?? null;
	});

	$effect(() => {
		let aborted = false;

		async function initializeAndSync() {
			if (!browser || !idToken) return;

			try {
				const initialItems = projectFromServer ? [projectFromServer] : [];
				await projectSyncManager.initialize({
					idToken,
					initialItems,
					setupSubscriptions: true,
					clearExisting: false
				});

				if (aborted || !projectSyncManager.isReady) return;

				if (!projectFromServer) {
					await projectSyncManager.syncList({
						queryVariables: { limit: 50, scope: 'OWNED_BY_ME' },
						setupSubscriptions: true,
						clearExisting: false
					});
				}
			} catch (err) {
				if (aborted) return;
				log.error('Error initializing project sync:', err);
			}
		}

		initializeAndSync();

		return () => {
			aborted = true;
			projectSyncManager.cleanup();
		};
	});

	$effect(() => {
		if (!browser || !idToken || !projectId) return;

		const spec = {
			query: print(S_ON_CREATE_NOTIFICATION),
			variables: { parentId: projectId },
			path: 'onCreateNotification',
			next: (notification: Notification) => {
				log.debug('Notification received for project:', projectId, notification);
				notificationStore.addNotification(notification);
			},
			error: (err: unknown) => {
				log.error('Notification subscription error for project', projectId, err);
			}
		};

		addSubscription(idToken, spec).catch((err) => {
			log.error('Failed to add notification subscription for project', projectId, err);
		});

		return () => {
			removeSubscription(spec);
		};
	});

	$effect(() => {
		if (!browser || !idToken || !routeProjectId) return;
		if (widgetTemplatesSyncedForProject === routeProjectId) return;
		widgetTemplatesSyncedForProject = routeProjectId;
		const qc = new GraphQLQueryClient(idToken);
		syncWidgetTemplates(qc, routeProjectId).catch((err) => {
			log.error('Failed to sync widget prompt templates:', err);
		});
	});

	$effect(() => {
		if (!browser || isNewProject) return;
		const rid = routeProjectId;
		if (!rid) return;
		if (globalProjectStore.selectedProjectId !== rid) {
			globalProjectStore.setSelectedProjectId(rid);
		}
	});

	const currentPath = $derived($page.url.pathname);

	const projectBasePath = $derived.by(() => {
		const m = currentPath.match(/^\/p\/[^/]+/);
		return m ? m[0] : '';
	});

	const pagesWithOwnTopBar = ['/dashboard', '/prompts', '/workflows', '/ontology'];
	const showLayoutTopBar = $derived(
		!pagesWithOwnTopBar.some((seg) => currentPath.includes(seg))
	);

	const pageTitle = $derived.by(() => {
		if (currentPath.includes('/docs')) return 'Documents';
		if (currentPath.includes('/dealroom')) return 'Deal Room';
		if (currentPath.includes('/dashboard')) return 'Dashboard';
		if (currentPath.includes('/prompts')) return 'Prompt Library';
		if (currentPath.includes('/workflows')) return 'Workflows';
		if (currentPath.includes('/ontology')) return 'Ontology Explorer';
		return 'Workspace';
	});

	function handleProjectChange(newProjectId: string | null) {
		if (!newProjectId || newProjectId === routeProjectId) return;
		const subPage = currentPath.replace(projectBasePath, '') || '';
		goto(`/p/${newProjectId}${subPage}`);
	}
</script>

<div
	class="flex min-h-[100svh] w-full {darkModeStore.darkMode ? 'bg-slate-900' : 'bg-slate-50'} text-gray-900"
	style={`padding-right:${ui.sidebarOpen ? ui.sidebarWidth : 0}px`}
>
	<div class="flex w-full min-w-0 flex-1 flex-col">
		{#if showLayoutTopBar}
			<TopBar
				{pageTitle}
				{idToken}
				selectedProjectId={routeProjectId}
				onProjectChange={handleProjectChange}
				notificationBellProps={{ projectName: project?.name ?? projectFromServer?.name }}
			/>
		{/if}

		<div class="flex-1 overflow-auto {darkModeStore.darkMode ? 'bg-slate-900' : 'bg-slate-50'}">
			{@render children()}
		</div>
	</div>

	<ChatDrawer />
</div>
