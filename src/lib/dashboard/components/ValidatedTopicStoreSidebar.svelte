<script lang="ts">
	import { validatedTopicStore } from '$lib/stores/validatedTopicStore';
	import { getWidgetStructuralHash, getTopicsByStructuralHash } from '$lib/dashboard/setup/widgetSchemaRegistration';
	import { getRegisteredManifests } from '$lib/dashboard/setup/widgetRegistry';
	import { topicDragStore, TOPIC_DROP_MIME } from '$lib/dashboard/stores/topicDragStore.svelte';
	import { dashboard } from '$lib/dashboard/stores/dashboard.svelte';
	import { themeStore } from '$lib/stores/themeStore.svelte';

	const darkMode = $derived(themeStore.darkMode);

	let isOpen = $state(false);

	function getTopicLabel(data: unknown, fallback: string): string {
		if (data && typeof data === 'object') {
			const d = data as Record<string, unknown>;
			if (typeof d.title === 'string' && d.title) return d.title;
			if (typeof d.label === 'string' && d.label) return d.label;
			if (typeof d.content === 'string' && d.content) return d.content.slice(0, 40) + (d.content.length > 40 ? '…' : '');
		}
		return fallback;
	}

	interface TopicItem {
		kind: string;
		displayName: string;
		topic: string;
		instanceId: string;
		label: string;
	}

	let topicItems = $derived.by((): TopicItem[] => {
		void validatedTopicStore.tree;
		const pid = dashboard.projectId;
		if (!pid) return [];

		const out: TopicItem[] = [];
		for (const manifest of getRegisteredManifests()) {
			const hash = getWidgetStructuralHash(manifest.kind);
			if (!hash) continue;
			const matches = getTopicsByStructuralHash(pid, hash);
			for (const m of matches) {
				out.push({
					kind: manifest.kind,
					displayName: manifest.displayName,
					topic: m.topic,
					instanceId: m.instanceId,
					label: getTopicLabel(m.data, m.instanceId.slice(0, 8))
				});
			}
		}
		return out;
	});

	let groupedByKind = $derived.by((): [string, { displayName: string; items: TopicItem[] }][] => {
		const acc: Record<string, { displayName: string; items: TopicItem[] }> = {};
		for (const item of topicItems) {
			let group = acc[item.kind];
			if (!group) {
				group = { displayName: item.displayName, items: [] };
				acc[item.kind] = group;
			}
			group.items.push(item);
		}
		return Object.entries(acc);
	});

	function handleDragStart(e: DragEvent, item: TopicItem) {
		if (!e.dataTransfer) return;
		e.dataTransfer.effectAllowed = 'copy';
		e.dataTransfer.setData(TOPIC_DROP_MIME, JSON.stringify({ topic: item.topic, widgetType: item.kind }));
		topicDragStore.set({ topic: item.topic, widgetType: item.kind });
	}

	function handleDragEnd() {
		topicDragStore.set(null);
	}
</script>

<div
	class="flex shrink-0 flex-col border-l transition-[width] duration-200 ease-out {darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'}"
	style="width: {isOpen ? '320px' : '44px'};"
>
	<!-- Toggle tab (always visible) -->
	<button
		type="button"
		onclick={() => (isOpen = !isOpen)}
		class="flex h-12 w-full items-center {isOpen ? 'justify-end px-2' : 'justify-center'} {darkMode ? 'text-slate-300 hover:bg-slate-700 hover:text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'} transition-colors"
		aria-label={isOpen ? 'Close data sources' : 'Open data sources'}
		title="ValidatedTopicStore – drag topics onto the dashboard to add widgets"
	>
		{#if isOpen}
			<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
		{:else}
			<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
		{/if}
	</button>

	{#if isOpen}
		<div class="flex flex-1 flex-col overflow-hidden">
			<h3 class="px-3 py-2 text-sm font-medium {darkMode ? 'text-slate-200' : 'text-slate-700'}">
				Data sources
			</h3>
			<p class="px-3 pb-2 text-xs {darkMode ? 'text-slate-400' : 'text-slate-500'}">
				Drag a topic onto the dashboard to create a widget.
			</p>
			<div class="min-h-0 flex-1 overflow-y-auto">
				{#each groupedByKind as [kind, group] (kind)}
					<div class="mb-2">
						<div class="px-3 py-1 text-xs font-medium uppercase tracking-wider {darkMode ? 'text-slate-500' : 'text-slate-400'}">
							{group.displayName}
						</div>
						<ul class="space-y-0.5">
							{#each group.items as item (item.topic)}
								<li>
									<button
										type="button"
										draggable="true"
										ondragstart={(e) => handleDragStart(e, item)}
										ondragend={handleDragEnd}
										class="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm {darkMode ? 'text-slate-200 hover:bg-slate-700' : 'text-slate-700 hover:bg-slate-100'} cursor-grab active:cursor-grabbing transition-colors"
									>
										<span class="min-w-0 flex-1 truncate" title={item.topic}>{item.label}</span>
									</button>
								</li>
							{/each}
						</ul>
					</div>
				{/each}
				{#if topicItems.length === 0}
					<p class="px-3 py-4 text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'}">
						No data sources yet. Run AI on a widget to create ontology instances.
					</p>
				{/if}
			</div>
		</div>
	{/if}
</div>
