<script lang="ts">
	import { themeStore } from '$lib/stores/themeStore.svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import ProfileTab from './tabs/ProfileTab.svelte';
	import PreferencesTab from './tabs/PreferencesTab.svelte';
	import NotificationsTab from './tabs/NotificationsTab.svelte';
	import SecurityTab from './tabs/SecurityTab.svelte';
	import BillingTab from './tabs/BillingTab.svelte';
	import type { PageData } from './$types';

	let { data } = $props<{ data: PageData }>();

	let darkMode = $derived(themeStore.darkMode);
	let isDarkTheme = $derived(themeStore.theme === 'dark');

	type TabId = 'profile' | 'preferences' | 'notifications' | 'security' | 'billing';

	const tabs: Array<{ id: TabId; label: string; icon: string }> = [
		{
			id: 'profile',
			label: 'Profile',
			icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />'
		},
		{
			id: 'preferences',
			label: 'Preferences',
			icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />'
		},
		{
			id: 'notifications',
			label: 'Notifications',
			icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />'
		},
		{
			id: 'security',
			label: 'Security',
			icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />'
		},
		{
			id: 'billing',
			label: 'Billing & Usage',
			icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />'
		}
	];

	let activeTab = $state<TabId>('profile');

	$effect(() => {
		const hash = $page.url.hash.replace('#', '') as TabId;
		if (hash && tabs.some((t) => t.id === hash)) {
			activeTab = hash;
		}
	});

	function setTab(id: TabId) {
		activeTab = id;
		goto(`#${id}`, { replaceState: true, noScroll: true });
	}
</script>

<div class="flex h-full min-h-screen w-full {isDarkTheme ? 'bg-slate-900' : 'bg-slate-50'}">
	<!-- Sidebar Navigation -->
	<div
		class="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r p-5 lg:flex {isDarkTheme
			? 'bg-slate-800/50 border-slate-700'
			: 'bg-white border-slate-200'}"
	>
		<div class="mb-6">
			<h1 class="text-xl font-semibold {isDarkTheme ? 'text-white' : 'text-slate-900'} tracking-tight">
				Settings
			</h1>
			<p class="mt-1 text-sm {isDarkTheme ? 'text-slate-400' : 'text-slate-500'}">
				Manage your account
			</p>
		</div>

		<nav class="space-y-1">
			{#each tabs as tab}
				<button
					type="button"
					onclick={() => setTab(tab.id)}
					class="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all {activeTab ===
					tab.id
						? isDarkTheme
							? 'bg-primary-900/40 text-primary-300'
							: 'bg-primary-50 text-primary-700'
						: isDarkTheme
							? 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'
							: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}"
				>
					<svg
						class="h-5 w-5 shrink-0"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						{@html tab.icon}
					</svg>
					{tab.label}
				</button>
			{/each}
		</nav>
	</div>

	<!-- Mobile Tab Bar -->
	<div class="fixed bottom-0 left-0 right-0 z-30 border-t lg:hidden {isDarkTheme ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}">
		<div class="flex">
			{#each tabs as tab}
				<button
					type="button"
					onclick={() => setTab(tab.id)}
					class="flex flex-1 flex-col items-center gap-1 py-2 text-[10px] font-medium transition-colors {activeTab ===
					tab.id
						? isDarkTheme
							? 'text-primary-400'
							: 'text-primary-600'
						: isDarkTheme
							? 'text-slate-500'
							: 'text-slate-400'}"
				>
					<svg
						class="h-5 w-5"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						{@html tab.icon}
					</svg>
					{tab.label}
				</button>
			{/each}
		</div>
	</div>

	<!-- Content Area -->
	<div class="flex-1 overflow-y-auto pb-20 lg:pb-0">
		<!-- Mobile Header -->
		<div class="border-b px-5 py-4 lg:hidden {isDarkTheme ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'}">
			<h1 class="text-xl font-semibold {isDarkTheme ? 'text-white' : 'text-slate-900'}">
				Settings
			</h1>
		</div>

		<div class="mx-auto max-w-3xl px-5 py-6 lg:px-8 lg:py-8">
			<!-- Tab Title -->
			<div class="mb-6">
				<h2 class="text-lg font-semibold {isDarkTheme ? 'text-white' : 'text-slate-900'}">
					{tabs.find((t) => t.id === activeTab)?.label}
				</h2>
			</div>

			{#if activeTab === 'profile'}
				<ProfileTab currentUser={data.currentUser} {darkMode} />
			{:else if activeTab === 'preferences'}
				<PreferencesTab {darkMode} />
			{:else if activeTab === 'notifications'}
				<NotificationsTab {darkMode} />
			{:else if activeTab === 'security'}
				<SecurityTab currentUser={data.currentUser} {darkMode} />
			{:else if activeTab === 'billing'}
				<BillingTab currentUser={data.currentUser} {darkMode} />
			{/if}
		</div>
	</div>
</div>
