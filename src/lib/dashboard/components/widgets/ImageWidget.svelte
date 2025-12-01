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
		darkMode?: boolean;
	}

	let { data, widgetId = 'image-widget-default', darkMode = false }: Props = $props();
	
	// Use topic naming convention: widget:image:${widgetId}
	const topic = $derived(getWidgetTopic('image', widgetId));
	
	// Subscribe to data updates using useTopic hook
	const dataStream = useTopic(topic, `image-widget-consumer-${widgetId}`);
	let widgetData = $derived(dataStream.current || data);

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
