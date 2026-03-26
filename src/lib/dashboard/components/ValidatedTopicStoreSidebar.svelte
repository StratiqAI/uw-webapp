<script lang="ts">
	import { validatedTopicStore } from '$lib/stores/validatedTopicStore';
	import { getWidgetTopicsByType, WIDGET_TYPES } from '$lib/dashboard/setup/widgetSchemaRegistration';
	import { topicDragStore, TOPIC_DROP_MIME } from '$lib/dashboard/stores/topicDragStore';
	import type { WidgetType } from '$lib/dashboard/types/widget';

	interface Props {
		darkMode?: boolean;
	}

	let { darkMode = false }: Props = $props();

	let isOpen = $state(false);

	const WIDGET_TYPE_LABELS: Record<WidgetType, string> = {
		title: 'Title',
		metric: 'Metric',
		paragraph: 'Paragraph',
		table: 'Table',
		image: 'Image',
		map: 'Map',
		lineChart: 'Line Chart',
		barChart: 'Bar Chart',
		donutChart: 'Donut Chart',
		areaChart: 'Area Chart',
		gauge: 'Gauge',
		sparkline: 'Sparkline',
		heatmap: 'Heatmap',
		divergingBarChart: 'Diverging Bar Chart',
		schema: 'Schema',
		locationQuotient: 'Location Quotient'
	};

	function getTopicLabel(data: unknown, id: string): string {
		if (data && typeof data === 'object') {
			const d = data as Record<string, unknown>;
			if (typeof d.title === 'string' && d.title) return d.title;
			if (typeof d.label === 'string' && d.label) return d.label;
			if (typeof d.content === 'string' && d.content) return d.content.slice(0, 40) + (d.content.length > 40 ? '…' : '');
		}
		return id;
	}

	// Reactive: re-read when store tree changes (validatedTopicStore.tree triggers reactivity)
	let topicsByType = $derived.by(() => {
		void validatedTopicStore.tree; // subscribe to tree changes
		const out: Array<{ widgetType: WidgetType; topic: string; id: string; label: string }> = [];
		for (const widgetType of WIDGET_TYPES) {
			const items = getWidgetTopicsByType(widgetType);
			for (const { id, data } of items) {
				const topic = `widgets/${widgetType}/${id}`;
				out.push({ widgetType, topic, id, label: getTopicLabel(data, id) });
			}
		}
		return out;
	});

	function handleDragStart(e: DragEvent, item: { topic: string; widgetType: WidgetType }) {
		if (!e.dataTransfer) return;
		e.dataTransfer.effectAllowed = 'copy';
		e.dataTransfer.setData(TOPIC_DROP_MIME, JSON.stringify({ topic: item.topic, widgetType: item.widgetType }));
		topicDragStore.set({ topic: item.topic, widgetType: item.widgetType });
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
				{#each WIDGET_TYPES as widgetType}
					{@const items = topicsByType.filter((t) => t.widgetType === widgetType)}
					{#if items.length > 0}
						<div class="mb-2">
							<div class="px-3 py-1 text-xs font-medium uppercase tracking-wider {darkMode ? 'text-slate-500' : 'text-slate-400'}">
								{WIDGET_TYPE_LABELS[widgetType]}
							</div>
							<ul class="space-y-0.5">
								{#each items as item (item.topic)}
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
					{/if}
				{/each}
				{#if topicsByType.length === 0}
					<p class="px-3 py-4 text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'}">
						No widget data in the store yet. Add widgets from the toolbar; their data will appear here.
					</p>
				{/if}
			</div>
		</div>
	{/if}
</div>
