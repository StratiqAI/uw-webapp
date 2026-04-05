<script lang="ts">
	import { getDealProject } from '$lib/dealRoom/dealRoomService';
	import { dealRoomSampleStore } from '$lib/dealRoom/stores/dealRoomSampleStore.svelte';
	import type { DealProject } from '$lib/dealRoom/types';

	interface Props {
		projectId: string;
		idToken: string;
		darkMode: boolean;
	}

	let { projectId, idToken, darkMode }: Props = $props();

	let project = $state<DealProject | null>(null);
	let loading = $state(true);
	let fromFallback = $state(false);

	const useSample = $derived(dealRoomSampleStore.isActive(projectId));

	$effect(() => {
		if (useSample && dealRoomSampleStore.data) {
			project = dealRoomSampleStore.data.project;
			fromFallback = true;
			loading = false;
			return;
		}
		if (!projectId || !idToken) return;
		let cancelled = false;
		loading = true;
		getDealProject(projectId, idToken).then((res) => {
			if (cancelled) return;
			project = res.data;
			fromFallback = res.fromFallback;
			loading = false;
		});
		return () => { cancelled = true; };
	});
</script>

<div class="space-y-6">
	{#if loading}
		<div class="flex items-center justify-center py-12">
			<div class="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"></div>
		</div>
	{:else if project}
		<!-- Hero -->
		<div class="rounded-xl overflow-hidden {darkMode ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-slate-200'} shadow-sm">
			{#if project.photoUrls?.length}
				<div class="aspect-[21/9] bg-slate-200 dark:bg-slate-700">
					<img
						src={project.photoUrls[0]}
						alt=""
						class="h-full w-full object-cover"
					/>
				</div>
			{:else}
				<div class="aspect-[21/9] flex items-center justify-center {darkMode ? 'bg-slate-700/50' : 'bg-indigo-50'}">
					<span class="text-4xl font-light {darkMode ? 'text-slate-500' : 'text-indigo-200'}">
						{project.name ?? 'Deal Room'}
					</span>
				</div>
			{/if}
			<div class="p-6">
				<h1 class="text-2xl font-bold {darkMode ? 'text-white' : 'text-slate-900'}">
					{project.headline ?? project.name ?? 'Deal Overview'}
				</h1>
				{#if project.summary}
					<p class="mt-2 {darkMode ? 'text-slate-300' : 'text-slate-600'}">{project.summary}</p>
				{/if}
				{#if fromFallback}
					<p class="mt-2 text-sm {darkMode ? 'text-amber-400' : 'text-amber-600'}">
						Showing demo content. Connect backend for live data.
					</p>
				{/if}
			</div>
		</div>

		<!-- Broker contact -->
		{#if project.brokerContactName || project.brokerContactEmail || project.brokerContactPhone}
			<div class="rounded-xl p-6 {darkMode ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-slate-200'} shadow-sm">
				<h2 class="text-lg font-semibold {darkMode ? 'text-white' : 'text-slate-900'} mb-3">Broker contact</h2>
				<div class="flex flex-wrap gap-4 {darkMode ? 'text-slate-300' : 'text-slate-600'}">
					{#if project.brokerContactName}
						<span>{project.brokerContactName}</span>
					{/if}
					{#if project.brokerContactEmail}
						<a href="mailto:{project.brokerContactEmail}" class="text-indigo-500 hover:underline">
							{project.brokerContactEmail}
						</a>
					{/if}
					{#if project.brokerContactPhone}
						<a href="tel:{project.brokerContactPhone}" class="text-indigo-500 hover:underline">
							{project.brokerContactPhone}
						</a>
					{/if}
				</div>
			</div>
		{/if}

		<!-- Map placeholder -->
		{#if project.mapEmbedUrl}
			<div class="rounded-xl overflow-hidden {darkMode ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-slate-200'} shadow-sm">
				<div class="aspect-video bg-slate-100 dark:bg-slate-700">
					<iframe
						title="Map"
						src={project.mapEmbedUrl}
						class="h-full w-full border-0"
						loading="lazy"
					></iframe>
				</div>
			</div>
		{:else}
			<div class="rounded-xl p-6 {darkMode ? 'bg-slate-800/50 border border-slate-700' : 'bg-slate-50 border border-slate-200'}">
				<p class="text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'}">
					Map not configured. Add <code class="px-1 rounded {darkMode ? 'bg-slate-700' : 'bg-slate-200'}">mapEmbedUrl</code> to the project to show location.
				</p>
			</div>
		{/if}
	{:else}
		<div class="rounded-xl p-6 {darkMode ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-slate-200'}">
			<p class={darkMode ? 'text-slate-400' : 'text-slate-500'}>No deal data. Select a project or connect the backend.</p>
		</div>
	{/if}
</div>
