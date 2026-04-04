<script lang="ts">
	import { page } from '$app/stores';
	import { darkModeStore } from '$lib/stores/darkMode.svelte';
	import { dealRoomSampleStore } from '$lib/stores/dealRoomSampleStore.svelte';
	import {
		DealDashboard,
		NdaGate,
		InvitationsTab,
		QAndATab,
		AnnouncementsTab,
		AnalyticsTab
	} from '$lib/components/deal-room';

	let { data } = $props();

	const projectId = $derived($page.params.projectId ?? '');
	const idToken = $derived(data?.idToken ?? '');
	const darkMode = $derived(darkModeStore.darkMode);
	const sampleActive = $derived(dealRoomSampleStore.isActive(projectId));

	type TabId = 'overview' | 'nda' | 'invitations' | 'qa' | 'announcements' | 'analytics';
	let activeTab = $state<TabId>('overview');

	const tabs: { id: TabId; label: string }[] = [
		{ id: 'overview', label: 'Overview' },
		{ id: 'nda', label: 'NDA & Access' },
		{ id: 'invitations', label: 'Invitations' },
		{ id: 'qa', label: 'Q&A' },
		{ id: 'announcements', label: 'Announcements' },
		{ id: 'analytics', label: 'Analytics' }
	];
</script>

<div class="w-full min-h-0 flex flex-col">
	<div class="mx-auto w-full max-w-5xl px-4 py-6">
		<!-- Sample data controls -->
		<div class="mb-4 flex flex-wrap items-center gap-2">
			{#if sampleActive}
				<span
					class="rounded-md px-2 py-1 text-xs font-medium {darkMode
						? 'bg-amber-900/40 text-amber-200'
						: 'bg-amber-100 text-amber-800'}"
				>
					Demo data
				</span>
				<button
					type="button"
					onclick={() => dealRoomSampleStore.disable()}
					class="rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors {darkMode
						? 'border-slate-600 text-slate-300 hover:bg-slate-700'
						: 'border-slate-300 text-slate-700 hover:bg-slate-100'}"
				>
					Clear sample data
				</button>
			{:else}
				<button
					type="button"
					onclick={() => dealRoomSampleStore.enable(projectId)}
					class="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors {darkMode
						? 'bg-indigo-600 text-white hover:bg-indigo-500'
						: 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200'}"
				>
					Populate with sample data
				</button>
			{/if}
		</div>

		<!-- Internal tabs -->
		<div class="mb-6 flex flex-wrap gap-2 border-b {darkMode ? 'border-slate-700' : 'border-slate-200'} pb-3">
			{#each tabs as tab}
				<button
					type="button"
					onclick={() => (activeTab = tab.id)}
					class="rounded-lg px-4 py-2 text-sm font-medium transition-colors {activeTab === tab.id
						? darkMode
							? 'bg-indigo-600 text-white'
							: 'bg-indigo-100 text-indigo-800'
						: darkMode
							? 'text-slate-400 hover:bg-slate-700 hover:text-slate-200'
							: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}"
				>
					{tab.label}
				</button>
			{/each}
		</div>

		{#if activeTab === 'overview'}
			<DealDashboard {projectId} {idToken} {darkMode} />
		{:else if activeTab === 'nda'}
			<NdaGate {projectId} {idToken} {darkMode} />
		{:else if activeTab === 'invitations'}
			<InvitationsTab {projectId} {idToken} {darkMode} />
		{:else if activeTab === 'qa'}
			<QAndATab {projectId} {idToken} {darkMode} />
		{:else if activeTab === 'announcements'}
			<AnnouncementsTab {projectId} {idToken} {darkMode} />
		{:else if activeTab === 'analytics'}
			<AnalyticsTab {projectId} {idToken} {darkMode} />
		{/if}
	</div>
</div>
