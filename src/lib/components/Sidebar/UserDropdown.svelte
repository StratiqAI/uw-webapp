<script lang="ts">
	import { Avatar, Dropdown, DropdownHeader, DropdownItem, DropdownGroup } from 'flowbite-svelte';
	import type { CurrentUser } from '$lib/types/auth';
	import { goto } from '$app/navigation';

	let { currentUser = $bindable(), darkMode = false, isSidebarOpen = false } = $props<{ currentUser?: CurrentUser; darkMode?: boolean; isSidebarOpen?: boolean }>();

	function handleSignOut() {
		goto('/auth/logout');
	}
</script>

{#if currentUser?.isAuthenticated}
	<div 
		id="user-drop"
		class="relative flex items-center {isSidebarOpen ? 'justify-start gap-3' : 'justify-center'} w-full cursor-pointer"
	>
		<div class="flex items-center gap-3 w-full">
		<Avatar
			src="/images/remove/dh.jpg"
				class="hover:opacity-80 transition-opacity flex-shrink-0"
			/>
			{#if isSidebarOpen}
				<div class="flex-1 min-w-0 text-left">
					<div class="text-sm font-medium {darkMode ? 'text-white' : 'text-slate-900'} truncate">
						{currentUser?.name || currentUser?.givenName || 'User'}
					</div>
					<div class="text-xs {darkMode ? 'text-slate-400' : 'text-slate-500'} truncate">
						{currentUser?.email || 'No email'}
					</div>
				</div>
			{/if}
		</div>
	</div>
	<Dropdown triggeredBy="#user-drop" placement="top" class={darkMode ? 'dark' : ''} style="z-index: 10000;">
		<DropdownHeader class={darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}>
			<span class="block text-sm {darkMode ? 'text-white' : 'text-slate-900'}">{currentUser?.name || currentUser?.givenName || 'User'}</span>
			<span class="block truncate text-sm font-medium {darkMode ? 'text-slate-400' : 'text-slate-600'}">{currentUser?.email || 'No email'}</span>
		</DropdownHeader>
		<DropdownGroup>
			<ul class="p-2 text-start text-sm font-medium {darkMode ? 'text-slate-200' : 'text-slate-900'}">
				<li>
					<a
						href="/user/account"
						title=""
						class="group flex items-center gap-2 rounded-md px-3 py-2 {darkMode ? 'text-slate-200 hover:bg-slate-700 hover:text-white' : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'} transition-colors"
					>
						<svg
							class="h-4 w-4 {darkMode ? 'text-slate-400 group-hover:text-white' : 'text-slate-500 group-hover:text-slate-900'}"
							aria-hidden="true"
							xmlns="http://www.w3.org/2000/svg"
							width="24"
							height="24"
							fill="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								fill-rule="evenodd"
								d="M12 20a7.966 7.966 0 0 1-5.002-1.756l.002.001v-.683c0-1.794 1.492-3.25 3.333-3.25h3.334c1.84 0 3.333 1.456 3.333 3.25v.683A7.966 7.966 0 0 1 12 20ZM2 12C2 6.477 6.477 2 12 2s10 4.477 10 10c0 5.5-4.44 9.963-9.932 10h-.138C6.438 21.962 2 17.5 2 12Zm10-5c-1.84 0-3.333 1.455-3.333 3.25S10.159 13.5 12 13.5c1.84 0 3.333-1.455 3.333-3.25S13.841 7 12 7Z"
								clip-rule="evenodd"
							/>
						</svg>
						Account
					</a>
				</li>
				<li>
					<a
						href="/user/settings"
						title=""
						class="group flex items-center gap-2 rounded-md px-3 py-2 {darkMode ? 'text-slate-200 hover:bg-slate-700 hover:text-white' : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'} transition-colors"
					>
						<svg
							class="h-4 w-4 {darkMode ? 'text-slate-400 group-hover:text-white' : 'text-slate-500 group-hover:text-slate-900'}"
							aria-hidden="true"
							xmlns="http://www.w3.org/2000/svg"
							width="24"
							height="24"
							fill="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								fill-rule="evenodd"
								d="M9.586 2.586A2 2 0 0 1 11 2h2a2 2 0 0 1 2 2v.089l.473.196.063-.063a2.002 2.002 0 0 1 2.828 0l1.414 1.414a2 2 0 0 1 0 2.827l-.063.064.196.473H20a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-.089l-.196.473.063.063a2.002 2.002 0 0 1 0 2.828l-1.414 1.414a2 2 0 0 1-2.828 0l-.063-.063-.473.196V20a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2v-.089l-.473-.196-.063.063a2.002 2.002 0 0 1-2.828 0l-1.414-1.414a2 2 0 0 1 0-2.827l.063-.064L4.089 15H4a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2h.09l.195-.473-.063-.063a2 2 0 0 1 0-2.828l1.414-1.414a2 2 0 0 1 2.827 0l.064.063L9 4.089V4a2 2 0 0 1 .586-1.414ZM8 12a4 4 0 1 1 8 0 4 4 0 0 1-8 0Z"
								clip-rule="evenodd"
							/>
						</svg>
						Settings
					</a>
				</li>
				<li>
					<a
						href="/user/notifications"
						title=""
						class="group flex items-center gap-2 rounded-md px-3 py-2 {darkMode ? 'text-slate-200 hover:bg-slate-700 hover:text-white' : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'} transition-colors"
					>
						<svg
							class="h-4 w-4 {darkMode ? 'text-slate-400 group-hover:text-white' : 'text-slate-500 group-hover:text-slate-900'}"
							aria-hidden="true"
							xmlns="http://www.w3.org/2000/svg"
							width="24"
							height="24"
							fill="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								d="M17.133 12.632v-1.8a5.406 5.406 0 0 0-4.154-5.262.955.955 0 0 0 .021-.106V3.1a1 1 0 0 0-2 0v2.364a.955.955 0 0 0 .021.106 5.406 5.406 0 0 0-4.154 5.262v1.8C6.867 15.018 5 15.614 5 16.807 5 17.4 5 18 5.538 18h12.924C19 18 19 17.4 19 16.807c0-1.193-1.867-1.789-1.867-4.175ZM6 6a1 1 0 0 1-.707-.293l-1-1a1 1 0 0 1 1.414-1.414l1 1A1 1 0 0 1 6 6Zm-2 4H3a1 1 0 0 1 0-2h1a1 1 0 1 1 0 2Zm14-4a1 1 0 0 1-.707-1.707l1-1a1 1 0 1 1 1.414 1.414l-1 1A1 1 0 0 1 18 6Zm3 4h-1a1 1 0 1 1 0-2h1a1 1 0 1 1 0 2ZM8.823 19a3.453 3.453 0 0 0 6.354 0H8.823Z"
							/>
						</svg>
						Notifications
					</a>
				</li>
			</ul>
		</DropdownGroup>
		<DropdownGroup>
			<ul class="p-2 text-start text-sm font-medium {darkMode ? 'text-slate-200' : 'text-slate-900'}">
				<li>
					<button
						onclick={() => (window.location.href = '/auth/logout')}
						title=""
						class="group flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm {darkMode ? 'text-red-400 hover:bg-red-900/20 hover:text-red-300' : 'text-red-600 hover:bg-red-50 hover:text-red-700'} transition-colors"
					>
						<svg
							class="h-4 w-4"
							aria-hidden="true"
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
						>
							<path
								stroke="currentColor"
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M20 12H8m12 0-4 4m4-4-4-4M9 4H7a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h2"
							></path>
						</svg>
						Sign Out
					</button>
				</li>
			</ul>
		</DropdownGroup>
	</Dropdown>
{:else}
	<!-- Show a placeholder or login button when not authenticated -->
	<Avatar src="/images/remove/dh.jpg" class="cursor-pointer opacity-50" />
{/if}
