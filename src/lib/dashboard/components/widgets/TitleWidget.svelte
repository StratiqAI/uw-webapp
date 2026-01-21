<script lang="ts">
	import type { TitleWidget } from '$lib/dashboard/types/widget';
	import { useReactiveValidatedTopic } from '$lib/hooks/validatedTopicStoreRunes.svelte';
	import { getWidgetTopic } from '$lib/dashboard/setup/widgetSchemaRegistration';

	interface Props {
		data: TitleWidget['data'];
		widgetId?: string;
		topicOverride?: string;
		darkMode?: boolean;
	}

	let { data, widgetId = 'title-widget-default', topicOverride, darkMode = false }: Props = $props();
	
	// Use topic override if provided, otherwise use default topic naming convention
	const topic = $derived(getWidgetTopic('title', widgetId, topicOverride));
	
	// Subscribe to data updates - reactive to topic changes
	const dataStream = useReactiveValidatedTopic<TitleWidget['data']>(() => topic);
	let widgetData = $derived<TitleWidget['data']>(dataStream.current || data);

	console.log(`🏷️ TitleWidget:${widgetId} - Initialized with ValidatedTopicStore`);
	console.log(`   Topic: ${topic}`);
</script>

<div class="title-widget flex h-full flex-col {darkMode ? 'bg-slate-800' : 'bg-slate-50'} justify-center text-{widgetData.alignment || 'left'}">
	<h2 class="text-2xl font-bold {darkMode ? 'text-slate-100' : 'text-slate-800'}">{widgetData.title}</h2>
	{#if widgetData.subtitle}
		<p class="mt-1 text-sm {darkMode ? 'text-slate-100' : 'text-slate-600'}">{widgetData.subtitle}</p>
	{/if}
</div>
