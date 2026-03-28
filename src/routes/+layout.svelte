<script lang="ts">
	import Sidebar from '$lib/components/Sidebar/Sidebar.svelte';
	import '../app.css';
	import type { LayoutData } from './$types';
	import { darkModeStore } from '$lib/stores/darkMode.svelte';
	import { setContext, onMount, onDestroy } from 'svelte';
	import { initializeWidgetSchemas } from '$lib/dashboard/setup/widgetSchemaRegistration';
	import { registerWidget } from '$lib/dashboard/setup/widgetRegistry';
	import { metricWidget } from '@stratiqai/widget-metric';
	import { browser } from '$app/environment';
	import { initTopicStoreSync } from '$lib/stores/topicStoreSync';
	import { validatedTopicStore } from '$lib/stores/validatedTopicStore';
	import { DashboardStorage } from '$lib/dashboard/utils/storage';

	// Register package-based widgets before schema initialization
	registerWidget(metricWidget);

	let { children, data } = $props<{ children: any; data: LayoutData }>();

	let destroySync: (() => void) | null = null;
	let unsubDashboardSync: (() => void) | null = null;

	let isSidebarOpen = $state(false);
	let sidebarWidthCollapsed = `w-14`;
	let sidebarWidthExpanded = `w-72`;
	let mainMarginLeftExpanded = `ml-72`;
	let mainMarginLeftCollapsed = `ml-14`;

	// Initialise schemas and cross-tab sync synchronously during component init.
	// This runs BEFORE child onMount callbacks (e.g. dashboard page), so the
	// sync layer's restored data is already in the store when the dashboard loads.
	if (browser) {
		try {
			initializeWidgetSchemas();
		} catch (error) {
			console.error('Failed to initialize widget schemas:', error);
		}

		destroySync = initTopicStoreSync(validatedTopicStore);

		// Keep DashboardStorage in sync with ALL widget topic changes (admin edits,
		// cross-tab sync, etc.) so it never holds stale data on next page load.
		unsubDashboardSync = validatedTopicStore.onChange((event) => {
			if (
				(event.type === 'publish' || event.type === 'delete') &&
				event.topic.startsWith('widgets/')
			) {
				DashboardStorage.autoSaveWidgetData();
			} else if (event.type === 'clear') {
				DashboardStorage.autoSaveWidgetData();
			}
		});

		// Immediately persist sync-restored data to DashboardStorage so the
		// two persistence layers start in sync.
		DashboardStorage.saveWidgetDataNow();
	}

	onMount(() => {
		if (typeof document !== 'undefined') {
			const isDark = document.documentElement.classList.contains('dark');
			darkModeStore.set(isDark);
		} else {
			darkModeStore.initialize();
		}
	});

	onDestroy(() => {
		destroySync?.();
		unsubDashboardSync?.();
	});
	
	// Provide dark mode store functions via context
	setContext('toggleDarkMode', darkModeStore.toggle);
	setContext('setDarkMode', darkModeStore.set);
	setContext('darkModeStore', darkModeStore);

	if (typeof localStorage !== 'undefined') {
		const saved = localStorage.getItem('sidebar-open') === 'true';
		if (saved != null) {
			isSidebarOpen = saved === true;
		}
	}

	function toggleSidebar() {
		isSidebarOpen = !isSidebarOpen;
		try {
			localStorage.setItem('sidebar-open', String(isSidebarOpen));
		} catch {}
	}
	// console.log("End of file +layout.svelte");
</script>

<div class="app-background-pattern h-full bg-primary-100/40 dark:bg-gradient-to-br dark:from-slate-900 dark:via-primary-950/30 dark:to-slate-950">
	<aside
		class={`transition-width fixed inset-y-0 left-0 z-40 flex h-screen flex-col border-r border-primary-200/50 bg-primary-50/60 duration-300 dark:border-primary-800/30 dark:bg-gradient-to-b dark:from-slate-900 dark:via-slate-900 dark:to-primary-950/20 ${isSidebarOpen ? `${sidebarWidthExpanded}` : `${sidebarWidthCollapsed}`} `}
	>
		<Sidebar bind:isSidebarOpen onclick={toggleSidebar} currentUser={data.currentUser} />
	</aside>
	<main class={`flex-1 overflow-y-auto transition-width duration-300 ${isSidebarOpen ? `${mainMarginLeftExpanded}` : `${mainMarginLeftCollapsed}`} space-y-6 bg-primary-50/30 dark:bg-slate-900/50  `}>
		{@render children()}
	</main>
</div>
