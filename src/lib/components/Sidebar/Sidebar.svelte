<script lang="ts">
	import UserDropdown from './UserDropdown.svelte';
	import type { CurrentUser } from '$lib/types/auth';
	import { getContext } from 'svelte';

	let active = $state('upload');
	let {
		isSidebarOpen = $bindable(),
		onclick: toggleSidebar,
		currentUser = $bindable()
	} = $props<{
		isSidebarOpen?: boolean;
		onclick?: () => void;
		currentUser?: CurrentUser;
	}>();

	let isCollapsed = $derived(!isSidebarOpen);
	
	// Get dark mode from context if available, default to false
	let darkMode = $state(false);
	$effect(() => {
		try {
			const contextDarkMode = getContext<boolean>('darkMode');
			if (contextDarkMode !== undefined) {
				darkMode = contextDarkMode;
			}
		} catch {
			// Context not available, use default
		}
	});

	const navItems = [
		{
			label: 'Projects',
			href: '/projects',
			activeKey: '/project',
			icon: `<path stroke="currentColor" stroke-linecap="round" stroke-width="2" d="M9 8h10M9 12h10M9 16h10M4.99 8H5m-.02 4h.01m0 4H5"/>`
		},
		{
			label: 'Workflows',
			href: '/workflows',
			activeKey: '/workflow',
			icon: `<path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5ZM14 5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1V5ZM4 16a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-3ZM14 13a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1v-6Z"/>`
		},
		{
			label: 'AI Library',
			href: '/ai-library',
			activeKey: '/ai-library',
			icon: `<path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"/>`
		},
		{
			label: 'Documents',
			href: '/documents',
			activeKey: '/document',
			icon: `<path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M10 3v4a1 1 0 0 1-1 1H5m5 10v-2m3 2v-6m3 6v-3m4-11v16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7.914a1 1 0 0 1 .293-.707l3.914-3.914A1 1 0 0 1 9.914 3H18a1 1 0 0 1 1 1Z"/>`
		},
		{
			label: 'Learning',
			href: '/learning',
			activeKey: 'analysis',
			icon: `<path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 14H4m6.5 3L8 20m5.5-3 2.5 3M4.88889 17H19.1111c.4909 0 .8889-.4157.8889-.9286V4.92857C20 4.41574 19.602 4 19.1111 4H4.88889C4.39797 4 4 4.41574 4 4.92857V16.0714c0 .5129.39797.9286.88889.9286ZM13 14v-3h4v3h-4Z"/>`
		},
		// {
		// 	label: 'Reports',
		// 	href: 'reports',
		// 	activeKey: 'reports',
		// 	icon: `<path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M10 3v4a1 1 0 0 1-1 1H5m4 10v-2m3 2v-6m3 6v-3m4-11v16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7.914a1 1 0 0 1 .293-.707l3.914-3.914A1 1 0 0 1 9.914 3H18a1 1 0 0 1 1 1Z"/>`
		// },
		{
			label: 'Support',
			href: '/support',
			activeKey: 'support',
			icon: `<path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6.03v13m0-13c-2.819-.831-4.715-1.076-8.029-1.023A.99.99 0 0 0 3 6v11c0 .563.466 1.014 1.03 1.007 3.122-.043 5.018.212 7.97 1.023m0-13c2.819-.831 4.715-1.076 8.029-1.023A.99.99 0 0 1 21 6v11c0 .563-.466 1.014-1.03 1.007-3.122-.043-5.018.212-7.97 1.023"/>`
		}
	];
</script>

<div class="group relative flex h-full w-full flex-col {darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border-r shadow-sm">
	<!-- Logo and Header -->
	<div class="relative {isSidebarOpen ? 'p-5' : 'p-3'} border-b {darkMode ? 'border-slate-700 bg-gradient-to-r from-slate-800 to-slate-800' : 'border-slate-200 bg-gradient-to-r from-slate-50 to-white'}">
		<div class="flex items-center {isSidebarOpen ? 'justify-between' : 'justify-center'}">
			<div class="flex items-center gap-3">
				<button
					onclick={toggleSidebar}
					class="flex items-center justify-center transition-all hover:opacity-80 {!isSidebarOpen ? 'hover:scale-110' : ''}"
					aria-label={isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
					title={!isSidebarOpen ? 'Click to expand sidebar' : ''}
				>
					<img
						src="/images/logos/logo-graphic-only.png"
						alt="StratiqAI Logo"
						class={`${isSidebarOpen ? 'h-10 w-10' : 'h-10 w-10'} transition-all object-contain`}
					/>
				</button>
				{#if isSidebarOpen}
					<div>
						<h1 class="text-xl font-semibold {darkMode ? 'text-white' : 'text-slate-900'} tracking-tight">StratiqAI</h1>
						<p class="text-xs {darkMode ? 'text-slate-400' : 'text-slate-500'} mt-0.5 font-medium">Platform</p>
					</div>
				{/if}
			</div>
			{#if isSidebarOpen}
				<button 
					onclick={toggleSidebar} 
					class="p-1.5 {darkMode ? 'text-slate-400 hover:text-white hover:bg-slate-700' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'} rounded-md transition-colors"
					aria-label="Collapse sidebar"
				>
					<svg
						class="h-5 w-5"
						aria-hidden="true"
						xmlns="http://www.w3.org/2000/svg"
						width="24"
						height="24"
						fill="none"
						viewBox="0 0 24 24"
					>
						<path
							stroke="currentColor"
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M5 12h14M5 12l4-4m-4 4 4 4"
						/>
					</svg>
				</button>
			{/if}
		</div>
	</div>

	{#if !isSidebarOpen}
		<!-- Expand button when collapsed - appears on hover -->
		<button 
			onclick={toggleSidebar} 
			class="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full p-2.5 {darkMode ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50'} border border-l-0 rounded-r-lg shadow-lg transition-all opacity-0 group-hover:opacity-100 z-50 pointer-events-none group-hover:pointer-events-auto"
			aria-label="Expand sidebar"
			title="Expand sidebar"
		>
			<svg
				class="h-5 w-5"
				aria-hidden="true"
				xmlns="http://www.w3.org/2000/svg"
				width="24"
				height="24"
				fill="none"
				viewBox="0 0 24 24"
			>
				<path
					stroke="currentColor"
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M19 12H5m7-7l7 7-7 7"
				/>
			</svg>
		</button>
	{/if}

	<!-- Navigation -->
	<nav class="flex-1 overflow-y-auto {isSidebarOpen ? 'p-5' : 'p-3'} space-y-1">
		{#each navItems as item}
			<a
				href={item.href}
				class={`group flex rounded-lg px-3 py-2.5 text-sm font-medium transition-all
					${isSidebarOpen ? 'items-center gap-3' : 'justify-center items-center'}
					${
						active === item.activeKey
							? darkMode 
								? 'bg-slate-700 text-white shadow-sm' 
								: 'bg-slate-100 text-slate-900 shadow-sm'
							: darkMode
								? 'text-slate-300 hover:bg-slate-700 hover:text-white'
								: 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
					}
				`}
				onclick={() => (active = item.activeKey)}
			>
				<svg 
					class={`flex-shrink-0 transition-colors ${isSidebarOpen ? 'w-5 h-5' : 'w-6 h-6'} ${
						active === item.activeKey
							? darkMode ? 'text-white' : 'text-slate-900'
							: darkMode ? 'text-slate-400 group-hover:text-white' : 'text-slate-500 group-hover:text-slate-900'
					}`}
					aria-hidden="true" 
					xmlns="http://www.w3.org/2000/svg" 
					width="24" 
					height="24" 
					fill="none" 
					viewBox="0 0 24 24"
				>
					{@html item.icon}
				</svg>
				{#if isSidebarOpen}
					<span class="flex-1 text-left whitespace-nowrap">{item.label}</span>
					<svg 
						class={`w-4 h-4 ${darkMode ? 'text-slate-500' : 'text-slate-400'} opacity-0 group-hover:opacity-100 transition-opacity`}
						fill="none" 
						stroke="currentColor" 
						viewBox="0 0 24 24"
					>
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 12h16m-7-7l7 7-7 7"></path>
					</svg>
				{/if}
			</a>
		{/each}
	</nav>

	<!-- Footer -->
	<div class="{isSidebarOpen ? 'p-5' : 'p-3'} border-t {darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-slate-50'}">
		<div class="flex items-center {isSidebarOpen ? 'justify-start' : 'justify-center'}">
			<UserDropdown {currentUser} {darkMode} />
		</div>
	</div>
</div>
