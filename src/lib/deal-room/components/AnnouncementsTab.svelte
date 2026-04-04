<script lang="ts">
	import { listAnnouncements, createAnnouncement } from '$lib/deal-room/dealRoomService';
	import { dealRoomSampleStore } from '$lib/deal-room/stores/dealRoomSampleStore.svelte';
	import type { Announcement } from '$lib/deal-room/types';

	interface Props {
		projectId: string;
		idToken: string;
		darkMode: boolean;
	}

	let { projectId, idToken, darkMode }: Props = $props();

	let announcements = $state<Announcement[]>([]);
	let loading = $state(true);
	let fromFallback = $state(false);
	let newBody = $state('');
	let creating = $state(false);

	const useSample = $derived(dealRoomSampleStore.isActive(projectId));

	function load() {
		if (useSample && dealRoomSampleStore.data) {
			announcements = dealRoomSampleStore.data.announcements ?? [];
			fromFallback = true;
			loading = false;
			return;
		}
		if (!projectId || !idToken) return;
		loading = true;
		listAnnouncements(projectId, idToken).then((res) => {
			announcements = res.data ?? [];
			fromFallback = res.fromFallback;
			loading = false;
		});
	}

	$effect(() => {
		if (useSample && dealRoomSampleStore.data) {
			announcements = dealRoomSampleStore.data.announcements ?? [];
			fromFallback = true;
			loading = false;
			return;
		}
		if (projectId && idToken) load();
	});

	async function handleCreate() {
		if (!idToken || !newBody.trim()) return;
		creating = true;
		await createAnnouncement(
			{ parentId: projectId, body: newBody.trim() },
			idToken
		);
		creating = false;
		newBody = '';
		load();
	}
</script>

<div class="space-y-6">
	<div class="rounded-xl p-6 {darkMode ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-slate-200'} shadow-sm">
		<h2 class="text-lg font-semibold {darkMode ? 'text-white' : 'text-slate-900'} mb-4">Announcements</h2>

		<div class="mb-6 space-y-3">
			<textarea
				bind:value={newBody}
				placeholder="Announcement message"
				rows="4"
				class="w-full rounded-lg border px-3 py-2 text-sm {darkMode ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-slate-300 text-slate-900'}"
			></textarea>
			<button
				onclick={handleCreate}
				disabled={creating || !newBody.trim()}
				class="rounded-lg px-4 py-2 text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
			>
				{creating ? 'Posting…' : 'Post announcement'}
			</button>
		</div>

		{#if loading}
			<div class="flex justify-center py-6">
				<div class="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"></div>
			</div>
		{:else}
			<ul class="space-y-4">
				{#each announcements as a}
					<li class="rounded-lg p-4 {darkMode ? 'bg-slate-700/50 border border-slate-600' : 'bg-slate-50 border border-slate-200'}">
						<p class="whitespace-pre-wrap {darkMode ? 'text-slate-200' : 'text-slate-900'}">{a.body ?? ''}</p>
						{#if a.createdAt}
							<div class="mt-2 text-xs {darkMode ? 'text-slate-500' : 'text-slate-400'}">{new Date(a.createdAt).toLocaleDateString()}</div>
						{/if}
					</li>
				{/each}
			</ul>
			{#if announcements.length === 0 && !loading}
				<p class="py-4 text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'}">No announcements yet.</p>
			{/if}
		{/if}

		{#if fromFallback}
			<p class="mt-3 text-sm {darkMode ? 'text-amber-400' : 'text-amber-600'}">Demo content. Connect backend for real announcements.</p>
		{/if}
	</div>
</div>
