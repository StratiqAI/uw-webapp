<script lang="ts">
	import type { ImageWidget } from '$lib/dashboard/types/widget';
	import { mapStore } from '$lib/stores/MapStore';
	import { useTopic } from '$lib/hooks/mapStoreRunes.svelte';
	import { getWidgetTopic, getWidgetSchemaId } from '$lib/dashboard/setup/widgetSchemaRegistration';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';

	interface Props {
		data: ImageWidget['data'];
		widgetId?: string;
		topicOverride?: string;
		darkMode?: boolean;
	}

	let { data, widgetId = 'image-widget-default', topicOverride, darkMode = false }: Props = $props();
	
	// Use topic override if provided, otherwise use default topic naming convention
	const topic = $derived(getWidgetTopic('image', widgetId, topicOverride));
	
	// Subscribe to data updates using useTopic hook
	const dataStream = useTopic<ImageWidget['data']>(topic, `image-widget-consumer-${widgetId}`);
	let widgetData = $derived<ImageWidget['data']>(dataStream.current || data);

	// Enforce schema on mount
	onMount(() => {
		if (browser) {
			const schemaId = getWidgetSchemaId('image');
			mapStore.enforceTopicSchema(topic, schemaId);
			console.log(`🖼️ ImageWidget:${widgetId} - Schema enforced: ${schemaId} on topic: ${topic}`);
		}
	});

	console.log(`🖼️ ImageWidget:${widgetId} - Initialized`);
	console.log(`   Topic: ${topic}`);
	console.log(`   Initial data:`, data);
</script>

<div class="image-widget h-full">
	<img
		src={widgetData.src}
		alt={widgetData.alt}
		class="h-full w-full object-{widgetData.objectFit || 'cover'} rounded"
	/>
</div>
