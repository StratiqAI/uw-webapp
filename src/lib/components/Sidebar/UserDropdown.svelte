<script lang="ts">
	import type { CurrentUser } from '$lib/types/auth';

	let { currentUser = $bindable(), darkMode = false, isSidebarOpen = false } = $props<{
		currentUser?: CurrentUser;
		darkMode?: boolean;
		isSidebarOpen?: boolean;
	}>();
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
	<div class="relative flex items-center {isSidebarOpen ? 'justify-start gap-3' : 'justify-center'} w-full">
		<div class="flex items-center gap-3 w-full">
			{@render genericAvatar()}
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
{:else}
	<!-- Show a placeholder when not authenticated -->
	<div class="cursor-pointer opacity-50">
		{@render genericAvatar()}
	</div>
{/if}
