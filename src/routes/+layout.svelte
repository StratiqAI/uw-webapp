<script lang="ts">
	import Sidebar from '$lib/components/Sidebar/Sidebar.svelte';
	import '../app.css';
	import type { LayoutData } from './$types';
	import { darkModeStore } from '$lib/stores/darkMode.svelte';
	import { setContext, onMount } from 'svelte';
	import { initializeWidgetSchemas } from '$lib/dashboard/setup/widgetSchemaRegistration';
	import { registerWidget } from '$lib/dashboard/setup/widgetRegistry';
	import { metricWidget } from '@stratiqai/widget-metric';
	import { browser } from '$app/environment';

	// Register package-based widgets before schema initialization
	registerWidget(metricWidget);

	let { children, data } = $props<{ children: any; data: LayoutData }>();

	let isSidebarOpen = $state(false);
	let sidebarWidthCollapsed = `w-14`;
	let sidebarWidthExpanded = `w-72`;
	let mainMarginLeftExpanded = `ml-72`;
	let mainMarginLeftCollapsed = `ml-14`;

	// Initialize dark mode store and provide via context
	// Note: Dark mode class is already applied via blocking script in app.html
	// This just syncs the store state with what's already applied
	onMount(() => {
		// Sync store with what's already on the document (from blocking script)
		if (typeof document !== 'undefined') {
			const isDark = document.documentElement.classList.contains('dark');
			darkModeStore.set(isDark);
		} else {
			darkModeStore.initialize();
		}

		// Register widget schemas at app startup (ValidatedTopicStore)
		if (browser) {
			try {
				initializeWidgetSchemas();
			} catch (error) {
				console.error('Failed to initialize widget schemas:', error);
			}
		}
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
