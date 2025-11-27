<script lang="ts">
	import type { TitleWidget } from '$lib/dashboard/types/widget';
	import { mapStore } from '$lib/stores/mapObjectStore';

	interface Props {
		data: TitleWidget['data'];
		darkMode?: boolean;
	}

	let { data, darkMode = false }: Props = $props();
	let widgetData = $state(data);

	let consumer = mapStore.registerConsumer<TitleWidget['data']>(
		'title-content',
		'title-widget'
	);

	console.log(`🏷️ TitleWidget: Initialized`);
	console.log('   Subscribing to content updates...\n');

	// Subscribe to content updates
	consumer.subscribe((data) => {
		if (data) {
			widgetData = data;
			console.log('Title content updated:', data);
		}
	});
</script>

<div class="title-widget flex h-full flex-col {darkMode ? 'bg-slate-800' : 'bg-slate-50'} justify-center text-{widgetData.alignment || 'left'}">
	<h2 class="text-2xl font-bold {darkMode ? 'text-slate-100' : 'text-slate-800'}">{widgetData.title}</h2>
	{#if widgetData.subtitle}
		<p class="mt-1 text-sm {darkMode ? 'text-slate-300' : 'text-slate-600'}">{widgetData.subtitle}</p>
	{/if}
</div>
