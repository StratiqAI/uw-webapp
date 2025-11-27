<script lang="ts">
	import type { ImageWidget } from '$lib/dashboard/types/widget';
	import { mapStore } from '$lib/stores/mapObjectStore';

	interface Props {
		data: ImageWidget['data'];
		darkMode?: boolean;
	}

	let { data, darkMode = false }: Props = $props();
	let widgetData = $state(data);

	let consumer = mapStore.registerConsumer<ImageWidget['data']>(
		'image-content',
		'image-widget'
	);

	console.log(`🖼️ ImageWidget: Initialized`);
	console.log('   Subscribing to content updates...\n');

	// Subscribe to content updates
	consumer.subscribe((data) => {
		if (data) {
			widgetData = data;
			console.log('Image content updated:', data);
		}
	});
</script>

<div class="image-widget h-full">
	<img
		src={widgetData.src}
		alt={widgetData.alt}
		class="h-full w-full object-{widgetData.objectFit || 'cover'} rounded"
	/>
</div>
