<script lang="ts">
	import { listInvitations, createInvitation } from '$lib/deal-room/dealRoomService';
	import { dealRoomSampleStore } from '$lib/deal-room/stores/dealRoomSampleStore.svelte';
	import type { Invitation } from '$lib/deal-room/types';

	interface Props {
		projectId: string;
		idToken: string;
		darkMode: boolean;
	}

	let { projectId, idToken, darkMode }: Props = $props();

	let invitations = $state<Invitation[]>([]);
	let loading = $state(true);
	let fromFallback = $state(false);
	let newEmail = $state('');
	let newRole = $state('BUYER');
	let creating = $state(false);

	const useSample = $derived(dealRoomSampleStore.isActive(projectId));

	function load() {
		if (useSample && dealRoomSampleStore.data) {
			invitations = dealRoomSampleStore.data.invitations ?? [];
			fromFallback = true;
			loading = false;
			return;
		}
		if (!projectId || !idToken) return;
		loading = true;
		listInvitations(projectId, idToken).then((res) => {
			invitations = res.data ?? [];
			fromFallback = res.fromFallback;
			loading = false;
		});
	}

	$effect(() => {
		if (useSample && dealRoomSampleStore.data) {
			invitations = dealRoomSampleStore.data.invitations ?? [];
			fromFallback = true;
			loading = false;
			return;
		}
		if (projectId && idToken) load();
	});

	async function handleCreate() {
		if (!newEmail.trim() || !idToken) return;
		creating = true;
		await createInvitation(
			{ parentId: projectId, email: newEmail.trim(), role: newRole },
			idToken
		);
		creating = false;
		newEmail = '';
		load();
	}
</script>

<div class="space-y-6">
	<div class="rounded-xl p-6 {darkMode ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-slate-200'} shadow-sm">
		<h2 class="text-lg font-semibold {darkMode ? 'text-white' : 'text-slate-900'} mb-4">Invitations</h2>

		<!-- Create form -->
		<div class="flex flex-wrap gap-3 mb-6">
			<input
				type="email"
				bind:value={newEmail}
				placeholder="Email"
				class="rounded-lg border px-3 py-2 text-sm w-56 {darkMode ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-slate-300 text-slate-900'}"
			/>
			<select
				bind:value={newRole}
				class="rounded-lg border px-3 py-2 text-sm {darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-900'}"
			>
				<option value="BUYER">Buyer</option>
				<option value="BROKER">Broker</option>
			</select>
			<button
				onclick={handleCreate}
				disabled={creating || !newEmail.trim()}
				class="rounded-lg px-4 py-2 text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
			>
				{creating ? 'Sending…' : 'Send invitation'}
			</button>
		</div>

		{#if loading}
			<div class="flex justify-center py-6">
				<div class="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"></div>
			</div>
		{:else}
			<ul class="divide-y {darkMode ? 'divide-slate-700' : 'divide-slate-200'}">
				{#each invitations as inv}
					<li class="py-3 flex items-center justify-between gap-4">
						<div>
							<span class="font-medium {darkMode ? 'text-slate-200' : 'text-slate-900'}">{inv.email ?? '—'}</span>
							<span class="text-sm ml-2 {darkMode ? 'text-slate-400' : 'text-slate-500'}">{inv.role ?? ''}</span>
						</div>
						<span class="text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'}">{inv.status ?? '—'}</span>
					</li>
				{/each}
			</ul>
			{#if invitations.length === 0 && !loading}
				<p class="py-4 text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'}">No invitations yet.</p>
			{/if}
		{/if}

		{#if fromFallback}
			<p class="mt-3 text-sm {darkMode ? 'text-amber-400' : 'text-amber-600'}">Demo data. Connect backend for real invitations.</p>
		{/if}
	</div>
</div>
