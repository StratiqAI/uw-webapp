<script lang="ts">
	import Sidebar from '$lib/components/Sidebar/Sidebar.svelte';
	import '../app.css';
	import type { LayoutData } from './$types';
	import { darkModeStore } from '$lib/stores/darkMode.svelte';
	import { setContext, onMount } from 'svelte';
	// console.log('In file +layout.svelte');
	let { children, data } = $props<{ children: any; data: LayoutData }>();

	let isSidebarOpen = $state(false);
	let sidebarWidthCollapsed = `w-14`;
	let sidebarWidthExpanded = `w-72`;
	let mainMarginLeftExpanded = `ml-72`;
	let mainMarginLeftCollapsed = `ml-14`;

	// Initialize dark mode store and provide via context
	onMount(() => {
		darkModeStore.initialize();
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

<div class="h-full bg-gray-50 dark:bg-gray-900">
	<aside
		class={`transition-width fixed inset-y-0 left-0 z-40 flex h-screen flex-col border-r border-gray-200 bg-white duration-300 dark:border-gray-700 dark:bg-gray-900 ${isSidebarOpen ? `${sidebarWidthExpanded}` : `${sidebarWidthCollapsed}`} `}
	>
		<Sidebar bind:isSidebarOpen onclick={toggleSidebar} currentUser={data.currentUser} />
	</aside>
	<main class={`flex-1 overflow-y-auto transition-width duration-300 ${isSidebarOpen ? `${mainMarginLeftExpanded}` : `${mainMarginLeftCollapsed}`} space-y-6 rounded-2xl bg-white bg-gradient-to-br from-zinc-50 via-red-50 to-indigo-50  shadow-md`}>
		{@render children()}
	</main>
</div>
