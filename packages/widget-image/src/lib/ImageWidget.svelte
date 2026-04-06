<script lang="ts">
	import type { ImageWidgetData } from './schema.js';
	import {
		useReactiveValidatedTopic,
		getDashboardWidgetHost,
		type StandardWidgetProps
	} from '@stratiqai/dashboard-widget-sdk';

	let {
		data,
		widgetId = 'image-widget-default',
		topicOverride,
		darkMode = false
	}: StandardWidgetProps<ImageWidgetData> = $props();

	const host = getDashboardWidgetHost();
	const topic = $derived(host.getWidgetTopic('image', widgetId, topicOverride));
	const dataStream = useReactiveValidatedTopic<ImageWidgetData>(() => topic);
	let widgetData = $derived<ImageWidgetData>(dataStream.current || data);
</script>

<div class="image-widget h-full">
	<img
		src={widgetData.src}
		alt={widgetData.alt}
		class="h-full w-full object-{widgetData.objectFit || 'cover'} rounded"
	/>
</div>
