<script lang="ts">
	import type { BarChartWidget } from '$lib/dashboard/types/widget';
	import { mapStore } from '$lib/stores/MapStore';
	import { useTopic } from '$lib/hooks/mapStoreRunes.svelte';
	import { getWidgetTopic, getWidgetSchemaId } from '$lib/dashboard/setup/widgetSchemaRegistration';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';

	interface Props {
		data: BarChartWidget['data'];
		widgetId?: string;
		darkMode?: boolean;
	}

	let { data, widgetId = 'barchart-widget-default', darkMode = false }: Props = $props();
	
	// Use topic naming convention: widget:barChart:${widgetId}
	const topic = $derived(getWidgetTopic('barChart', widgetId));
	
	// Subscribe to data updates using useTopic hook
	const dataStream = useTopic(topic, `barchart-widget-consumer-${widgetId}`);
	let widgetData = $derived(dataStream.current || data);

	// Enforce schema on mount
	onMount(() => {
		if (browser) {
			const schemaId = getWidgetSchemaId('barChart');
			mapStore.enforceTopicSchema(topic, schemaId);
			console.log(`📊 BarChartWidget:${widgetId} - Schema enforced: ${schemaId} on topic: ${topic}`);
		}
	});

	console.log(`📊 BarChartWidget:${widgetId} - Initialized`);
	console.log(`   Topic: ${topic}`);
	console.log(`   Initial data:`, data);
	
	// Note: You'll need to integrate with a charting library like Chart.js
	// This is a placeholder implementation
</script>
  
  <div class="bar-chart-widget h-full flex items-center justify-center {darkMode ? 'bg-slate-800' : 'bg-slate-50'} rounded">
    <div class="text-center">
      <p class="{darkMode ? 'text-slate-300' : 'text-slate-600'} mb-2">Bar Chart ({widgetData.orientation || 'vertical'})</p>
      <p class="text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'}">
        {widgetData.datasets.length} dataset(s) with {widgetData.labels.length} bars
      </p>
      <!-- Integrate Chart.js or similar library here -->
    </div>
  </div>