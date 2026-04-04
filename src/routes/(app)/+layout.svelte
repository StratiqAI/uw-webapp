<script lang="ts">
	import Sidebar from '$lib/components/layout/Sidebar.svelte';
	import type { LayoutData } from './$types';

	let { children, data } = $props<{ children: any; data: LayoutData }>();

	let isSidebarOpen = $state(false);
	let sidebarWidthCollapsed = `w-14`;
	let sidebarWidthExpanded = `w-72`;
	let mainMarginLeftExpanded = `ml-72`;
	let mainMarginLeftCollapsed = `ml-14`;

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
</script>

<aside
	class={`transition-width fixed inset-y-0 left-0 z-40 flex h-screen flex-col border-r border-primary-200/50 bg-primary-50/60 duration-300 dark:border-primary-800/30 dark:bg-slate-900 ${isSidebarOpen ? `${sidebarWidthExpanded}` : `${sidebarWidthCollapsed}`} `}
>
	<Sidebar bind:isSidebarOpen onclick={toggleSidebar} currentUser={data.currentUser} />
</aside>
<main class={`flex-1 overflow-y-auto transition-width duration-300 ${isSidebarOpen ? `${mainMarginLeftExpanded}` : `${mainMarginLeftCollapsed}`} space-y-6 bg-primary-50/30 dark:bg-slate-900/50`}>
	{@render children()}
</main>
