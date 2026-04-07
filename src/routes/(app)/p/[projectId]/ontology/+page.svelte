<script lang="ts">
	import type { PageData } from './$types';
	import type { EntityDefinition } from '@stratiqai/types-simple';
	import { onMount, onDestroy } from 'svelte';
	import { page } from '$app/stores';
	import { darkModeStore } from '$lib/stores/darkMode.svelte';
	import { validatedTopicStore } from '$lib/stores/validatedTopicStore';
	import { OntologySyncManager } from '$lib/services/realtime/websocket/sync-managers/OntologySyncManager';
	import TopBar from '$lib/components/layout/TopBar.svelte';
	import DefinitionSidebar from '$lib/ontology/DefinitionSidebar.svelte';
	import InstanceTable from '$lib/ontology/InstanceTable.svelte';
	import DefinitionDetail from '$lib/ontology/DefinitionDetail.svelte';
	import ActivityIndicator from '$lib/ontology/ActivityIndicator.svelte';
	import { createLogger } from '$lib/utils/logger';

	const log = createLogger('ontology-page');

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();
	let darkMode = $derived(darkModeStore.darkMode);
	let projectId = $derived($page.params.projectId);

	let syncManager = $state<OntologySyncManager | null>(null);
	let selectedDefId = $state<string | null>(null);
	let isLoading = $state(true);

	const store = validatedTopicStore;

	let definitions = $derived.by((): Array<{ id: string; data: EntityDefinition }> => {
		void store.tree;
		if (!projectId) return [];
		return store.getAllAt<EntityDefinition>(`ontology/p/${projectId}/def`);
	});

	let selectedDefinition = $derived.by((): EntityDefinition | undefined => {
		void store.tree;
		if (!projectId || !selectedDefId) return undefined;
		return store.at<EntityDefinition>(`ontology/p/${projectId}/def/${selectedDefId}`);
	});

	let instances = $derived.by((): Array<{ id: string; data: Record<string, unknown> }> => {
		void store.tree;
		if (!projectId || !selectedDefId) return [];
		const instParent = `ontology/p/${projectId}/def/${selectedDefId}/inst`;
		const rawEntries = store.getAllAt<Record<string, unknown>>(instParent);
		const result: Array<{ id: string; data: Record<string, unknown> }> = [];
		for (const entry of rawEntries) {
			if (entry.data && typeof entry.data === 'object' && 'data' in entry.data) {
				result.push({ id: entry.id, data: entry.data.data as Record<string, unknown> });
			}
		}
		return result;
	});

	let defCount = $derived(definitions.length);
	let instCount = $derived(instances.length);
	let managerStatus = $derived(syncManager?.status ?? 'inactive');

	function handleSelectDef(id: string) {
		selectedDefId = id;
	}

	onMount(async () => {
		if (data.idToken && projectId) {
			try {
				syncManager = await OntologySyncManager.create({
					idToken: data.idToken,
					projectId
				});
				log.debug('OntologySyncManager ready');
			} catch (err) {
				log.error('Failed to initialize OntologySyncManager:', err);
			}
		}
		isLoading = false;
	});

	onDestroy(() => {
		syncManager?.cleanup();
		syncManager = null;
	});
</script>

<div class="flex h-screen w-full flex-col overflow-hidden {darkMode ? 'bg-slate-900' : 'bg-slate-50'} transition-colors">
	<TopBar pageTitle="Ontology Explorer">
		{#snippet tabs()}
			<div class="flex items-center gap-2">
				<span class="rounded-full px-2 py-0.5 text-xs font-medium {darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}">
					{defCount} definition{defCount !== 1 ? 's' : ''}
				</span>
				{#if selectedDefId}
					<span class="rounded-full px-2 py-0.5 text-xs font-medium {darkMode ? 'bg-indigo-900/30 text-indigo-400' : 'bg-indigo-100 text-indigo-600'}">
						{instCount} instance{instCount !== 1 ? 's' : ''}
					</span>
				{/if}
			</div>
		{/snippet}
		{#snippet actions()}
			<ActivityIndicator status={managerStatus} {darkMode} />
		{/snippet}
	</TopBar>

	{#if isLoading}
		<div class="flex flex-1 items-center justify-center">
			<div class="text-center">
				<div class="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-primary-300 border-t-primary-600"></div>
				<p class="mt-3 text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'}">Loading ontology...</p>
			</div>
		</div>
	{:else}
		<div class="flex flex-1 overflow-hidden">
			<!-- Left: Definition Sidebar -->
			<div class="flex w-64 shrink-0 flex-col overflow-hidden border-r {darkMode ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-white'}">
				<DefinitionSidebar
					{definitions}
					selectedId={selectedDefId}
					onselect={handleSelectDef}
					{darkMode}
				/>
			</div>

			<!-- Center: Instance Table -->
			<div class="flex flex-1 flex-col overflow-hidden {darkMode ? 'bg-slate-900' : 'bg-slate-50'}">
				{#if selectedDefinition}
					<InstanceTable
						definition={selectedDefinition}
						{instances}
						{darkMode}
					/>
				{:else}
					<div class="flex flex-1 items-center justify-center">
						<div class="text-center">
							<svg class="mx-auto h-12 w-12 {darkMode ? 'text-slate-700' : 'text-slate-300'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125v-3.75"/>
							</svg>
							<p class="mt-3 text-sm font-medium {darkMode ? 'text-slate-400' : 'text-slate-500'}">Select a definition</p>
							<p class="mt-1 text-xs {darkMode ? 'text-slate-600' : 'text-slate-400'}">Choose an entity definition from the sidebar to view its instances</p>
						</div>
					</div>
				{/if}
			</div>

			<!-- Right: Definition Detail -->
			{#if selectedDefinition}
				<div class="flex w-80 shrink-0 flex-col overflow-hidden border-l {darkMode ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-white'}">
					<DefinitionDetail
						definition={selectedDefinition}
						{projectId}
						{darkMode}
					/>
				</div>
			{/if}
		</div>
	{/if}
</div>
