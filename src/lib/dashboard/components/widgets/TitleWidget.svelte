<script lang="ts">
	import type { TitleWidget } from '$lib/dashboard/types/widget';
	import { mapStore } from '$lib/stores/MapStore';
	import { useTopic } from '$lib/hooks/mapStoreRunes.svelte';
	import { getWidgetTopic, getWidgetSchemaId } from '$lib/dashboard/setup/widgetSchemaRegistration';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';

	interface Props {
		data: TitleWidget['data'];
		widgetId?: string; // Widget instance ID for topic naming
		darkMode?: boolean;
	}

	let { data, widgetId = 'title-widget-default', darkMode = false }: Props = $props();
	
	// Use topic naming convention: widget:title:${widgetId}
	const topic = $derived(getWidgetTopic('title', widgetId));
	
	// Subscribe to data updates using useTopic hook
	const dataStream = useTopic(topic, `title-widget-consumer-${widgetId}`);
	let widgetData = $derived(dataStream.current || data);
	// Enforce schema on mount
	onMount(() => {
		if (browser) {
			const schemaId = getWidgetSchemaId('title');
			mapStore.enforceTopicSchema(topic, schemaId);
			console.log(`🏷️ TitleWidget:${widgetId} - Schema enforced: ${schemaId} on topic: ${topic}`);			
		}
	});

	console.log(`🏷️ TitleWidget:${widgetId} - Initialized`);
	console.log(`   Topic: ${topic}`);
	console.log(`   Initial data:`, data);
</script>

<div class="title-widget flex h-full flex-col {darkMode ? 'bg-slate-800' : 'bg-slate-50'} justify-center text-{widgetData.alignment || 'left'}">
	<h2 class="text-2xl font-bold {darkMode ? 'text-slate-100' : 'text-slate-800'}">{widgetData.title}</h2>
	{#if widgetData.subtitle}
		<p class="mt-1 text-sm {darkMode ? 'text-slate-100' : 'text-slate-600'}">{widgetData.subtitle}</p>
	{/if}
</div>
