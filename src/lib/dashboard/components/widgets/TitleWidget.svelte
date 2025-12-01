<script lang="ts">
	import type { TitleWidget } from '$lib/dashboard/types/widget';
	import { mapStore } from '$lib/stores/MapStore';
	import { useReactiveTopic } from '$lib/hooks/mapStoreRunes.svelte';
	import { getWidgetTopic, getWidgetSchemaId } from '$lib/dashboard/setup/widgetSchemaRegistration';
	import { browser } from '$app/environment';

	interface Props {
		data: TitleWidget['data'];
		widgetId?: string; // Widget instance ID for topic naming
		topicOverride?: string; // Optional topic override
		darkMode?: boolean;
	}

	let { data, widgetId = 'title-widget-default', topicOverride, darkMode = false }: Props = $props();
	
	// Use topic override if provided, otherwise use default topic naming convention
	const topic = $derived(getWidgetTopic('title', widgetId, topicOverride));
	const consumerId = $derived(`title-widget-consumer-${widgetId}`);
	
	// Subscribe to data updates - reactive to topic changes
	const dataStream = useReactiveTopic<TitleWidget['data']>(() => topic, () => consumerId);
	let widgetData = $derived<TitleWidget['data']>(dataStream.current || data);
	
	// Enforce schema when topic changes
	$effect(() => {
		if (browser) {
			const schemaId = getWidgetSchemaId('title');
			mapStore.enforceTopicSchema(topic, schemaId);
			console.log(`🏷️ TitleWidget:${widgetId} - Schema enforced: ${schemaId} on topic: ${topic}`);
		}
	});
</script>

<div class="title-widget flex h-full flex-col {darkMode ? 'bg-slate-800' : 'bg-slate-50'} justify-center text-{widgetData.alignment || 'left'}">
	<h2 class="text-2xl font-bold {darkMode ? 'text-slate-100' : 'text-slate-800'}">{widgetData.title}</h2>
	{#if widgetData.subtitle}
		<p class="mt-1 text-sm {darkMode ? 'text-slate-100' : 'text-slate-600'}">{widgetData.subtitle}</p>
	{/if}
</div>
