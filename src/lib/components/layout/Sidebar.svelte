<script lang="ts">
	import UserDropdown from './UserDropdown.svelte';
	import ThemeSwitcher from './ThemeSwitcher.svelte';
	import type { CurrentUser } from '$lib/types/auth';
	import { themeStore } from '$lib/stores/themeStore.svelte';
	import { page } from '$app/stores';
	import { browser } from '$app/environment';
	import { DashboardStorage } from '$lib/dashboard/utils/storage';

	type NavItem = {
		label: string;
		href: string;
		activeKey: string;
		icon: string;
		/** If true, row is non-navigable and shows a coming-soon treatment */
		disabled?: boolean;
	};

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

	/** Matches app chrome: dark sidebar only when theme is `dark` (light/warm use non-dark branch + CSS tokens). */
	let isDarkTheme = $derived(themeStore.theme === 'dark');

	const activeProjectId = $derived.by(() => {
		const path = $page.url.pathname;
		const m = path.match(/^\/p\/([^/]+)/);
		if (m?.[1]) return m[1];
		return browser ? DashboardStorage.getSelectedProjectId() : null;
	});

	const navItems = $derived.by((): NavItem[] => {
		const pid = activeProjectId;
		const projectBase = pid ? `/p/${pid}` : null;
		const docsHref = projectBase ? `${projectBase}/docs` : '/p';
		const dashboardHref = projectBase ? `${projectBase}/dashboard` : '/p';
		const workflowsHref = projectBase ? `${projectBase}/workflows` : '/p';
		const promptsHref = projectBase ? `${projectBase}/prompts` : '/p';
		const dealroomHref = projectBase ? `${projectBase}/dealroom` : '/p';

		return [
			{
				label: 'Projects',
				href: '/p',
				activeKey: '/p',
				icon: `<path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 0 0-1.883 2.542l.857 6a2.25 2.25 0 0 0 2.227 1.932H19.05a2.25 2.25 0 0 0 2.227-1.932l.857-6a2.25 2.25 0 0 0-1.883-2.542m-16.5 0V6A2.25 2.25 0 0 1 6 3.75h3.879a1.5 1.5 0 0 1 1.06.44l2.122 2.12a1.5 1.5 0 0 0 1.06.44H18A2.25 2.25 0 0 1 20.25 9v.776"/>`
			},
			{
				label: 'Documents',
				href: docsHref,
				activeKey: '/docs',
				icon: `<path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m5.231 13.481L15 17.25m-4.5-15H5.625c-.621 0-1.125.504-1.125 1.125v16.5c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Zm3.75 11.625a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"/>`
			},
			{
				label: 'Dashboard',
				href: dashboardHref,
				activeKey: '/dashboard',
				icon: `<path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z"/>`
			},
			{
				label: 'Workflows',
				href: workflowsHref,
				activeKey: '/workflows',
				disabled: true,
				icon: `<path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"/>`
			},
			{
				label: 'AI Studio',
				href: promptsHref,
				activeKey: '/prompts',
				icon: `<path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"/>`
			},
			{
				label: 'Deal Room',
				href: dealroomHref,
				activeKey: '/dealroom',
				icon: `<path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 0 0 .75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 0 0-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0 1 12 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 0 1-.673-.38m0 0A2.18 2.18 0 0 1 3 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 0 1 3.413-.387m7.5 0V5.25A2.25 2.25 0 0 0 13.5 3h-3a2.25 2.25 0 0 0-2.25 2.25v.894m7.5 0a48.667 48.667 0 0 0-7.5 0M12 12.75h.008v.008H12v-.008Z"/>`
			},
			{
				label: 'Learning',
				href: '/learn',
				activeKey: '/learn',
				icon: `<path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5"/>`
			},
			{
				label: 'Support',
				href: '/help',
				activeKey: '/help',
				icon: `<path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16.712 4.33a9.027 9.027 0 0 1 1.652 1.306c.51.51.944 1.064 1.306 1.652M16.712 4.33l-3.448 4.138m3.448-4.138a9.014 9.014 0 0 0-9.424 0M19.67 7.288l-4.138 3.448m4.138-3.448a9.014 9.014 0 0 1 0 9.424m-4.138-5.976a3.736 3.736 0 0 0-.88-1.388 3.737 3.737 0 0 0-1.388-.88m2.268 2.268a3.765 3.765 0 0 1 0 2.528m-2.268-4.796a3.765 3.765 0 0 0-2.528 0m4.796 4.796c-.181.506-.475.982-.88 1.388a3.736 3.736 0 0 1-1.388.88m2.268-2.268 4.138 3.448m0 0a9.027 9.027 0 0 1-1.306 1.652c-.51.51-1.064.944-1.652 1.306m0 0-3.448-4.138m3.448 4.138a9.014 9.014 0 0 1-9.424 0m5.976-4.138a3.765 3.765 0 0 1-2.528 0m0 0a3.736 3.736 0 0 1-1.388-.88 3.737 3.737 0 0 1-.88-1.388m2.268 2.268L7.288 19.67m0 0a9.024 9.024 0 0 1-1.652-1.306 9.027 9.027 0 0 1-1.306-1.652m0 0 4.138-3.448M4.33 16.712a9.014 9.014 0 0 1 0-9.424m4.138 5.976a3.765 3.765 0 0 1 0-2.528m0 0c.181-.506.475-.982.88-1.388a3.736 3.736 0 0 1 1.388-.88m-2.268 2.268L4.33 7.288m6.406 1.18L7.288 4.33m0 0a9.024 9.024 0 0 0-1.652 1.306A9.025 9.025 0 0 0 4.33 7.288"/>`
			}
		];
	});

	function navItemIsActive(item: NavItem): boolean {
		if (item.disabled) return false;
		const path = $page.url.pathname;
		if (!path.includes(item.activeKey)) return false;

		const hasMoreSpecificMatch = navItems.some(
			(n) =>
				!n.disabled &&
				n.activeKey !== item.activeKey &&
				n.activeKey.length > item.activeKey.length &&
				path.includes(n.activeKey)
		);
		return !hasMoreSpecificMatch;
	}
</script>

<div class="group relative flex h-full w-full flex-col {isDarkTheme ? 'bg-slate-900 border-primary-800/40' : 'bg-white border-primary-200/60'} border-r shadow-sm overflow-visible">
	<!-- Logo and Header -->
	<div class="relative {isSidebarOpen ? 'p-5' : 'p-3'} border-b {isDarkTheme ? 'border-primary-700/40 border-b-primary-500/50 bg-slate-900' : 'border-primary-300/60 bg-white'}">
		<div class="flex items-center {isSidebarOpen ? 'justify-between' : 'justify-center'}">
			<div class="flex items-center gap-3">
				<button
					onclick={toggleSidebar}
					class="flex items-center justify-center transition-all hover:opacity-80 {!isSidebarOpen ? 'hover:scale-110' : ''}"
					aria-label={isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
					title={!isSidebarOpen ? 'Click to expand sidebar' : ''}
				>
					<img
						src="/images/logos/logo.png"
						alt="StratiqAI Logo"
						class={`${isSidebarOpen ? 'h-16 w-16' : 'h-12 w-12'} transition-all object-contain`}
					/>
				</button>
				{#if isSidebarOpen}
					<div>
						<h1 class="text-xl font-semibold {isDarkTheme ? 'text-white' : 'text-slate-900'} tracking-tight">StratiqAI</h1>
						<p class="text-xs {isDarkTheme ? 'text-slate-400' : 'text-slate-500'} mt-0.5 font-medium">Platform</p>
					</div>
				{/if}
			</div>
		</div>
	</div>

	{#if !isSidebarOpen}
		<!-- Expand button when collapsed - appears on hover -->
		<button 
			onclick={toggleSidebar} 
			class="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full p-2.5 {isDarkTheme ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50'} border border-l-0 rounded-r-lg shadow-lg transition-all opacity-0 group-hover:opacity-100 z-50 pointer-events-none group-hover:pointer-events-auto"
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
	{:else}
		<!-- Collapse button when expanded - appears on hover -->
		<button 
			onclick={toggleSidebar} 
			class="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full p-2.5 {isDarkTheme ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50'} border border-l-0 rounded-r-lg shadow-lg transition-all opacity-0 group-hover:opacity-100 z-50 pointer-events-none group-hover:pointer-events-auto"
			aria-label="Collapse sidebar"
			title="Collapse sidebar"
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

	<!-- Navigation -->
	<nav class="flex-1 overflow-y-auto {isSidebarOpen ? 'p-5' : 'p-3'} space-y-1">
		{#each navItems as item}
			{#if item.disabled}
				<div
					class={`flex rounded-lg py-2.5 text-sm font-medium cursor-not-allowed select-none
					${isSidebarOpen ? 'items-center gap-3 px-3' : 'justify-center items-center px-3'}
					${isDarkTheme ? 'text-slate-500' : 'text-slate-400'}`}
					aria-disabled="true"
					title={isSidebarOpen ? undefined : `${item.label} — Coming Soon`}
					aria-label={`${item.label}, Coming Soon, unavailable`}
				>
					<svg
						class={`shrink-0 ${isSidebarOpen ? 'w-5 h-5' : 'w-6 h-6'} ${isDarkTheme ? 'text-slate-500' : 'text-slate-400'}`}
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
						<span class="flex-1 min-w-0 text-left truncate">{item.label}</span>
						<span
							class={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${isDarkTheme ? 'bg-slate-700/90 text-slate-400' : 'bg-slate-200 text-slate-600'}`}
						>
							Coming Soon
						</span>
					{/if}
				</div>
			{:else}
				<a
					href={item.href}
					class={`group flex rounded-lg py-2.5 text-sm font-medium transition-all
					${isSidebarOpen ? 'items-center gap-3 px-3' : 'justify-center items-center px-3'}
					${
						navItemIsActive(item)
							? isDarkTheme
								? 'bg-primary-900/50 text-primary-100 shadow-sm'
								: 'bg-primary-100 text-primary-800 shadow-sm'
							: isDarkTheme
								? 'text-slate-300 hover:bg-primary-900/40 hover:text-primary-200'
								: 'text-slate-700 hover:bg-primary-100/60 hover:text-primary-900'
					}
				`}
					
				>
					<svg
						class={`shrink-0 transition-colors ${isSidebarOpen ? 'w-5 h-5' : 'w-6 h-6'} ${
							navItemIsActive(item)
								? isDarkTheme
									? 'text-primary-100'
									: 'text-primary-800'
								: isDarkTheme
									? 'text-slate-400 group-hover:text-primary-200'
									: 'text-slate-500 group-hover:text-primary-700'
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
							class={`w-4 h-4 ${isDarkTheme ? 'text-slate-500' : 'text-slate-400'} opacity-0 group-hover:opacity-100 transition-opacity`}
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 12h16m-7-7l7 7-7 7"
							></path>
						</svg>
					{/if}
				</a>
			{/if}
		{/each}
	</nav>

	<!-- Footer -->
	<div class="{isSidebarOpen ? 'p-4' : 'p-3'} border-t {isDarkTheme ? 'border-primary-800/40 bg-slate-900' : 'border-primary-200/60 bg-white'} relative z-50 overflow-visible">
		<div class="flex flex-col {isSidebarOpen ? 'gap-3' : 'gap-2 items-center'}">
			<div class="flex {isSidebarOpen ? 'justify-start' : 'justify-center'}">
				<ThemeSwitcher collapsed={!isSidebarOpen} />
			</div>
			<div class="flex items-center {isSidebarOpen ? 'justify-start gap-3' : 'justify-center'} relative">
				<UserDropdown {currentUser} darkMode={isDarkTheme} {isSidebarOpen} />
			</div>
		</div>
	</div>
</div>
