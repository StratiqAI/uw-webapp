<script lang="ts">
	import { ui } from '$lib/stores/ui.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { darkModeStore } from '$lib/stores/darkMode.svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import TabButton from '$lib/components/ui/TabButton.svelte';

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

	// Get current active tab for dropdown
	const activeTab = $derived.by(() => {
		for (const tab of tabs) {
			if (isActive(tab.href)) {
				return tab.href === 'get-started' ? workspaceBasePath : `${workspaceBasePath}/${tab.href}`;
			}
		}
		// Default to get-started if no match
		return workspaceBasePath;
	});

	// Handle dropdown change
	function handleDropdownChange(event: Event) {
		const select = event.target as HTMLSelectElement;
		if (select.value) {
			goto(select.value);
		}
	}
</script>

<div class="sticky top-0 z-10 {darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border-b shadow-sm">
	<!-- Main Header -->
	<div class="h-14 flex items-center justify-between px-3 sm:px-6 {darkMode ? 'bg-gradient-to-r from-slate-800 via-slate-800 to-slate-800' : 'bg-gradient-to-r from-white via-indigo-50/30 to-white'}">
		<div class="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
			<div class="flex items-center gap-2 sm:gap-3">
				<div class="w-1 h-6 sm:h-8 {darkMode ? 'bg-indigo-500' : 'bg-indigo-600'} rounded-full flex-shrink-0"></div>
				<h1 class="text-lg sm:text-xl md:text-2xl font-semibold {darkMode ? 'text-white' : 'text-slate-900'} tracking-tight truncate">
					<span class="{darkMode ? 'text-indigo-400' : 'text-indigo-600'}">{pageTitle}</span>
				</h1>
			</div>
			<!-- Divider - hidden on mobile -->
			<div class="hidden sm:block h-4 w-px {darkMode ? 'bg-slate-700' : 'bg-slate-200'} flex-shrink-0"></div>
			<!-- Project name - hidden on small screens, shown on md+ -->
			<span class="hidden md:inline-block text-sm {darkMode ? 'text-slate-300' : 'text-slate-600'} truncate">
				{projectName}
			</span>
		</div>
		<div class="flex items-center gap-1 sm:gap-2 flex-shrink-0">
			<!-- Dark mode toggle - always visible -->
			<button
				class="p-1.5 sm:p-2 {darkMode ? 'text-slate-300 hover:text-indigo-400 hover:bg-indigo-900/20' : 'text-slate-600 hover:text-indigo-600 hover:bg-indigo-50'} rounded-md transition-colors"
				onclick={toggleDarkMode}
				aria-label="Toggle dark mode"
				title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
			>
				{#if darkMode}
					<svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path>
					</svg>
				{:else}
					<svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>
					</svg>
				{/if}
			</button>
			<!-- Help button - hidden on mobile, shown on sm+ -->
			<div class="hidden sm:block">
				<Button href="/support" icon>Help & Documentation</Button>
			</div>
			<!-- Show AI button - always visible but text hidden on mobile -->
			<Button onclick={() => ui.setOpen(!ui.sidebarOpen)} className="px-2 sm:px-4">
				<span class="hidden sm:inline">{ui.sidebarOpen ? 'Hide StratiqAI' : 'Show StratiqAI'}</span>
				<span class="sm:hidden text-xs">AI</span>
			</Button>
		</div>
	</div>

	<!-- Tab Navigation -->
	<div class="h-auto min-h-[3rem] border-t {darkMode ? 'border-slate-700 bg-gradient-to-r from-slate-800 via-slate-800 to-slate-800' : 'border-slate-200 bg-gradient-to-r from-slate-50 via-indigo-50/40 to-slate-50'} px-3 sm:px-6 py-2">
		<!-- Dropdown for small screens -->
		<div class="md:hidden">
			<select
				value={activeTab}
				onchange={handleDropdownChange}
				class="w-full px-3 py-2 text-sm rounded-lg border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 {darkMode 
					? 'bg-slate-700 border-indigo-500 text-white focus:ring-indigo-400 focus:border-indigo-400' 
					: 'bg-white border-indigo-200 text-slate-900 focus:ring-indigo-500 focus:border-indigo-500'}"
			>
				{#each tabs as tab}
					{@const tabHref = tab.href === 'get-started' ? workspaceBasePath : `${workspaceBasePath}/${tab.href}`}
					<option value={tabHref}>
						{tab.label}
					</option>
				{/each}
			</select>
		</div>

		<!-- Tab buttons for larger screens -->
		<div class="hidden md:flex items-center gap-1 overflow-x-auto scrollbar-hide">
			{#each tabs as tab}
				{@const tabHref = tab.href === 'get-started' ? workspaceBasePath : `${workspaceBasePath}/${tab.href}`}
				<TabButton 
					href={tabHref}
					className={`flex-shrink-0 ${isActive(tab.href) 
						? (darkMode 
							? 'text-white bg-indigo-600 hover:bg-indigo-700 border-indigo-500 shadow-sm' 
							: 'text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border-indigo-200 font-semibold shadow-sm')
						: (darkMode
							? 'text-slate-400 hover:text-indigo-400 hover:bg-indigo-900/20 hover:border-indigo-700/30'
							: 'text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/50 hover:border-indigo-200')}`}
				>
					<span class="whitespace-nowrap text-sm">{tab.label}</span>
				</TabButton>
			{/each}
		</div>
	</div>
</div>

<style>
	.scrollbar-hide {
		-ms-overflow-style: none;
		scrollbar-width: none;
	}
	.scrollbar-hide::-webkit-scrollbar {
		display: none;
	}
</style>
