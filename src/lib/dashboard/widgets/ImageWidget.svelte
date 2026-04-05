<script lang="ts">
	import type { ImageWidget } from '$lib/dashboard/types/widget';
	import { useReactiveValidatedTopic } from '$lib/hooks/validatedTopicStoreRunes.svelte';
	import { getWidgetTopic } from '$lib/dashboard/setup/widgetSchemaRegistration';
	import { themeStore } from '$lib/stores/themeStore.svelte';

	interface Props {
		data: ImageWidget['data'];
		widgetId?: string;
		topicOverride?: string;
	}

	let { data, widgetId = 'image-widget-default', topicOverride }: Props = $props();
	const darkMode = $derived(themeStore.darkMode);

	
	// Use topic override if provided, otherwise use default topic naming convention
	const topic = $derived(getWidgetTopic('image', widgetId, topicOverride));
	
	// Subscribe to data updates using ValidatedTopicStore hook (reactive to topic changes)
	const dataStream = useReactiveValidatedTopic<ImageWidget['data']>(() => topic);
	let widgetData = $derived<ImageWidget['data']>(dataStream.current || data);
</script>

<div class="image-widget h-full">
	<img
		src={widgetData.src}
		alt={widgetData.alt}
		class="h-full w-full object-{widgetData.objectFit || 'cover'} rounded"
	/>
</div>
