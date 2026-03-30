<script lang="ts">
	import type { CurrentUser } from '$lib/types/auth';

	let { currentUser = $bindable(), darkMode = false, isSidebarOpen = false } = $props<{
		currentUser?: CurrentUser;
		darkMode?: boolean;
		isSidebarOpen?: boolean;
	}>();

	let menuOpen = $state(false);
	let menuRef = $state<HTMLDivElement | null>(null);

	function toggleMenu() {
		menuOpen = !menuOpen;
	}

	function closeMenu() {
		menuOpen = false;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') closeMenu();
	}

	function handleClickOutside(e: MouseEvent) {
		if (menuRef && !menuRef.contains(e.target as Node)) {
			closeMenu();
		}
	}

	$effect(() => {
		if (menuOpen) {
			document.addEventListener('click', handleClickOutside, true);
			document.addEventListener('keydown', handleKeydown);
		}
		return () => {
			document.removeEventListener('click', handleClickOutside, true);
			document.removeEventListener('keydown', handleKeydown);
		};
	});

	let displayName = $derived(currentUser?.name || currentUser?.givenName || 'User');
	let displayEmail = $derived(currentUser?.email || 'No email');
	let displayRole = $derived(currentUser?.groups?.[0] ?? 'Standard');
	let displayTenant = $derived(currentUser?.tenant ?? 'default');
</script>

{#snippet genericAvatar()}
	<div
		class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full {darkMode
			? 'bg-slate-600 text-slate-300'
			: 'bg-slate-200 text-slate-600'}"
		aria-hidden="true"
	>
		<svg class="h-[55%] w-[55%]" fill="currentColor" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
			<path
				fill-rule="evenodd"
				d="M8 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
				clip-rule="evenodd"
			/>
		</svg>
	</div>
{/snippet}

{#if currentUser?.isAuthenticated}
	<div class="relative w-full" bind:this={menuRef}>
		<button
			type="button"
			onclick={toggleMenu}
			class="flex items-center {isSidebarOpen ? 'justify-start gap-3' : 'justify-center'} w-full rounded-lg px-2 py-1.5 transition-colors
				{darkMode
					? 'hover:bg-slate-800 focus-visible:bg-slate-800'
					: 'hover:bg-slate-100 focus-visible:bg-slate-100'}
				focus-visible:outline-none focus-visible:ring-2 {darkMode ? 'focus-visible:ring-primary-500' : 'focus-visible:ring-primary-400'}"
			aria-haspopup="true"
			aria-expanded={menuOpen}
		>
			{@render genericAvatar()}
			{#if isSidebarOpen}
				<div class="flex-1 min-w-0 text-left">
					<div class="text-sm font-medium {darkMode ? 'text-white' : 'text-slate-900'} truncate">
						{displayName}
					</div>
					<div class="text-xs {darkMode ? 'text-slate-400' : 'text-slate-500'} truncate">
						{displayEmail}
					</div>
				</div>
				<svg
					class="h-4 w-4 shrink-0 transition-transform {menuOpen ? 'rotate-180' : ''} {darkMode ? 'text-slate-400' : 'text-slate-500'}"
					fill="none" stroke="currentColor" viewBox="0 0 24 24"
				>
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
				</svg>
			{/if}
		</button>

		{#if menuOpen}
			<div
				class="absolute {isSidebarOpen ? 'left-0 right-0' : 'left-0 w-64'} bottom-full mb-2 rounded-lg border shadow-lg z-100
					{darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}"
				role="menu"
			>
				<!-- User info header -->
				<div class="px-4 py-3 border-b {darkMode ? 'border-slate-700' : 'border-slate-200'}">
					<p class="text-sm font-semibold {darkMode ? 'text-white' : 'text-slate-900'} truncate">
						{displayName}
					</p>
					<p class="text-xs {darkMode ? 'text-slate-400' : 'text-slate-500'} truncate mt-0.5">
						{displayEmail}
					</p>
					<div class="flex items-center gap-2 mt-2">
						<span class="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide
							{darkMode ? 'bg-primary-900/50 text-primary-300' : 'bg-primary-100 text-primary-700'}">
							{displayRole}
						</span>
						<span class="text-[10px] {darkMode ? 'text-slate-500' : 'text-slate-400'} truncate">
							{displayTenant}
						</span>
					</div>
				</div>

				<!-- Menu items -->
				<div class="py-1">
				<a
					href="/user/settings"
					onclick={closeMenu}
					class="flex items-center gap-3 px-4 py-2 text-sm transition-colors
						{darkMode ? 'text-slate-300 hover:bg-slate-700 hover:text-white' : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'}"
					role="menuitem"
				>
					<svg class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
							d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.248a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
							d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
					</svg>
					Settings
				</a>
				</div>

				<!-- Sign out -->
				<div class="border-t {darkMode ? 'border-slate-700' : 'border-slate-200'} py-1">
					<a
						href="/auth/logout"
						onclick={closeMenu}
						class="flex items-center gap-3 px-4 py-2 text-sm transition-colors
							{darkMode ? 'text-red-400 hover:bg-red-900/30 hover:text-red-300' : 'text-red-600 hover:bg-red-50 hover:text-red-700'}"
						role="menuitem"
					>
						<svg class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
								d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
						</svg>
						Sign out
					</a>
				</div>
			</div>
		{/if}
	</div>
{:else}
	<div class="cursor-pointer opacity-50">
		{@render genericAvatar()}
	</div>
{/if}
