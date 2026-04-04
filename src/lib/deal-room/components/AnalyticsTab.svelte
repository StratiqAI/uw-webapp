<script lang="ts">
	import { listBuyerEngagements, listMatchScores } from '$lib/deal-room/dealRoomService';
	import { dealRoomSampleStore } from '$lib/deal-room/stores/dealRoomSampleStore.svelte';
	import type { BuyerEngagement, MatchScore } from '$lib/deal-room/types';

	interface Props {
		projectId: string;
		idToken: string;
		darkMode: boolean;
	}

	let { projectId, idToken, darkMode }: Props = $props();

	let engagements = $state<BuyerEngagement[]>([]);
	let matchScores = $state<MatchScore[]>([]);
	let loading = $state(true);
	let fromFallback = $state(false);

	const useSample = $derived(dealRoomSampleStore.isActive(projectId));

	function load() {
		if (useSample && dealRoomSampleStore.data) {
			engagements = dealRoomSampleStore.data.engagements ?? [];
			matchScores = dealRoomSampleStore.data.matchScores ?? [];
			fromFallback = true;
			loading = false;
			return;
		}
		if (!projectId || !idToken) return;
		loading = true;
		Promise.all([
			listBuyerEngagements(projectId, idToken),
			listMatchScores(projectId, idToken)
		]).then(([engRes, matchRes]) => {
			engagements = engRes.data ?? [];
			matchScores = matchRes.data ?? [];
			fromFallback = engRes.fromFallback || matchRes.fromFallback;
			loading = false;
		});
	}

	$effect(() => {
		if (useSample && dealRoomSampleStore.data) {
			engagements = dealRoomSampleStore.data.engagements ?? [];
			matchScores = dealRoomSampleStore.data.matchScores ?? [];
			fromFallback = true;
			loading = false;
			return;
		}
		if (projectId && idToken) load();
	});
</script>

<div class="space-y-6">
	<!-- Buyer engagement -->
	<div class="rounded-xl p-6 {darkMode ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-slate-200'} shadow-sm">
		<h2 class="text-lg font-semibold {darkMode ? 'text-white' : 'text-slate-900'} mb-4">Buyer engagement</h2>
		{#if loading}
			<div class="flex justify-center py-6">
				<div class="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"></div>
			</div>
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full text-sm">
					<thead>
						<tr class="{darkMode ? 'text-slate-400 border-b border-slate-700' : 'text-slate-500 border-b border-slate-200'}">
							<th class="text-left py-2 pr-4">User</th>
							<th class="text-right py-2 pr-4">Views</th>
							<th class="text-right py-2 pr-4">Downloads</th>
							<th class="text-left py-2">Last active</th>
						</tr>
					</thead>
					<tbody class="{darkMode ? 'text-slate-300' : 'text-slate-700'}">
						{#each engagements as e}
							<tr class="border-b {darkMode ? 'border-slate-700' : 'border-slate-100'}">
								<td class="py-2 pr-4 font-mono text-xs">{e.userId}</td>
								<td class="text-right py-2 pr-4">{e.documentViewCount}</td>
								<td class="text-right py-2 pr-4">{e.downloadCount}</td>
								<td class="py-2">{e.lastActiveAt ? new Date(e.lastActiveAt).toLocaleString() : '—'}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
			{#if engagements.length === 0 && !loading}
				<p class="py-4 text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'}">No engagement data yet.</p>
			{/if}
		{/if}
		{#if fromFallback}
			<p class="mt-3 text-sm {darkMode ? 'text-amber-400' : 'text-amber-600'}">Demo data. Connect backend for real analytics.</p>
		{/if}
	</div>

	<!-- Match scores (shortlist) -->
	<div class="rounded-xl p-6 {darkMode ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-slate-200'} shadow-sm">
		<h2 class="text-lg font-semibold {darkMode ? 'text-white' : 'text-slate-900'} mb-4">AI match shortlist</h2>
		{#if loading}
			<div class="flex justify-center py-6">
				<div class="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"></div>
			</div>
		{:else}
			<ul class="space-y-3">
				{#each matchScores as m}
					<li class="rounded-lg p-3 {darkMode ? 'bg-slate-700/50 border border-slate-600' : 'bg-slate-50 border border-slate-200'}">
						<div class="flex items-center justify-between gap-4">
							<span class="font-mono text-xs {darkMode ? 'text-slate-400' : 'text-slate-500'}">{m.investorProfileId ?? m.id}</span>
							{#if m.score != null}
								<span class="font-medium {darkMode ? 'text-indigo-400' : 'text-indigo-600'}">Score: {m.score}</span>
							{/if}
						</div>
						{#if m.rationale}
							<p class="mt-1 text-sm {darkMode ? 'text-slate-400' : 'text-slate-600'}">{m.rationale}</p>
						{/if}
						{#if m.suggestedAction}
							<p class="mt-1 text-xs {darkMode ? 'text-slate-500' : 'text-slate-400'}">Suggested: {m.suggestedAction}</p>
						{/if}
					</li>
				{/each}
			</ul>
			{#if matchScores.length === 0 && !loading}
				<p class="py-4 text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'}">No match scores yet.</p>
			{/if}
		{/if}
	</div>
</div>
