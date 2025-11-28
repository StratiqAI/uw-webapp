<script lang="ts">
	import { ui } from '$lib/stores/ui.svelte';
	import Button from '$lib/ui/Button.svelte';
	import { darkModeStore } from '$lib/stores/darkMode.svelte';
	import { page } from '$app/stores';
	import TabButton from '$lib/ui/TabButton.svelte';

	let { projectName } = $props<{ projectName: string }>();

	// Dark mode support
	let darkMode = $derived.by(() => darkModeStore.darkMode);
	let toggleDarkMode = darkModeStore.toggle;

	// Get current route to determine active tab and page title
	const currentPath = $derived($page.url.pathname);
	
	// Get base workspace path (everything up to and including the projectId)
	const workspaceBasePath = $derived.by(() => {
		const parts = currentPath.split('/');
		const workspaceIndex = parts.indexOf('workspace');
		if (workspaceIndex !== -1 && workspaceIndex + 2 < parts.length) {
			// Return path up to projectId: /projects/workspace/[projectId]
			return parts.slice(0, workspaceIndex + 3).join('/');
		}
		return '';
	});

	// Map routes to page titles
	const pageTitle = $derived.by(() => {
		if (currentPath.includes('get-started')) return 'Get Started';
		if (currentPath.includes('document-analysis')) return 'Document Analysis';
		if (currentPath.includes('market-analysis')) return 'Market Analysis';
		if (currentPath.includes('property-analysis')) return 'Financial Analysis';
		if (currentPath.includes('investment-analysis')) return 'Investment Analysis';
		return 'Workspace';
	});

	// Tab navigation items
	const tabs = [
		{ href: 'get-started', label: 'Get Started' },
		{ href: 'document-analysis', label: 'Document Analysis' },
		{ href: 'market-analysis', label: 'Market Analysis' },
		{ href: 'property-analysis', label: 'Financial Analysis' },
		{ href: 'investment-analysis', label: 'Location/Site' },
		{ href: 'investment-analysis', label: 'Political/Legal' },
		{ href: 'investment-analysis', label: 'Insight/Sensitivity' },
		{ href: 'investment-analysis', label: 'Reports' }
	];

	// Check if a tab is active
	const isActive = (href: string) => {
		return currentPath === `${workspaceBasePath}/${href}` || 
		       (href === 'get-started' && currentPath === workspaceBasePath);
	};
</script>

<div class="sticky top-0 z-10 {darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border-b shadow-sm">
	<!-- Main Header -->
	<div class="h-14 flex items-center justify-between px-6">
		<div class="flex items-center gap-4 flex-1 min-w-0">
			<h1 class="text-2xl font-semibold {darkMode ? 'text-white' : 'text-slate-900'} tracking-tight truncate">
				{pageTitle}
			</h1>
			<div class="h-4 w-px {darkMode ? 'bg-slate-700' : 'bg-slate-200'}"></div>
			<span class="text-sm {darkMode ? 'text-slate-300' : 'text-slate-600'} truncate">
				{projectName}
			</span>
		</div>
		<div class="flex items-center gap-2 flex-shrink-0">
			<button
				class="p-2 {darkMode ? 'text-slate-300 hover:text-white hover:bg-slate-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'} rounded-md transition-colors"
				onclick={toggleDarkMode}
				aria-label="Toggle dark mode"
				title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
			>
				{#if darkMode}
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path>
					</svg>
				{:else}
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>
					</svg>
				{/if}
			</button>
			<Button href="/support" icon>Help & Documentation</Button>
			<Button onclick={() => ui.setOpen(!ui.sidebarOpen)}>
				{ui.sidebarOpen ? 'Hide AI' : 'Show AI'}
			</Button>
		</div>
	</div>

	<!-- Tab Navigation -->
	<div class="h-12 border-t {darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-slate-50'} px-6 flex items-center gap-1 overflow-x-auto">
		{#each tabs as tab}
			{@const tabHref = tab.href === 'get-started' ? workspaceBasePath : `${workspaceBasePath}/${tab.href}`}
			<TabButton 
				href={tabHref}
				className={isActive(tab.href) 
					? (darkMode 
						? 'text-white bg-slate-700 hover:bg-slate-600' 
						: 'text-slate-900 bg-white hover:bg-gray-50')
					: ''}
			>
				{tab.label}
			</TabButton>
		{/each}
	</div>
</div>
