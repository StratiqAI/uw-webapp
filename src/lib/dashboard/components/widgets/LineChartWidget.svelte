<script lang="ts">
	import type { LineChartWidget } from '$lib/dashboard/types/widget';
	import { useReactiveValidatedTopic } from '$lib/hooks/validatedTopicStoreRunes.svelte';
	import { getWidgetTopic } from '$lib/dashboard/setup/widgetSchemaRegistration';

	interface Props {
		data: LineChartWidget['data'];
		widgetId?: string;
		topicOverride?: string;
		darkMode?: boolean;
	}

	let { data, widgetId = 'linechart-widget-default', topicOverride, darkMode = false }: Props = $props();
	
	// Use topic override if provided, otherwise use default topic naming convention
	const topic = $derived(getWidgetTopic('lineChart', widgetId, topicOverride));
	
	// Subscribe to data updates using ValidatedTopicStore hook (reactive to topic changes)
	const dataStream = useReactiveValidatedTopic<LineChartWidget['data']>(() => topic);
	let widgetData = $derived<LineChartWidget['data']>(dataStream.current || data);

	$effect(() => {
		console.log(`📈 LineChartWidget:${widgetId} - Initialized with ValidatedTopicStore`);
		console.log(`   Topic: ${topic}`);
		console.log(`   Initial data:`, data);
	});
	
	// Note: You'll need to integrate with a charting library like Chart.js
	// This is a placeholder implementation
</script>
  
<div class="line-chart-widget h-full flex items-center justify-center {darkMode ? 'bg-slate-800' : 'bg-slate-50'} rounded">
	<div class="text-center">
		<p class="{darkMode ? 'text-slate-300' : 'text-slate-600'} mb-2">Line Chart</p>
		{#if widgetData && 'datasets' in widgetData && 'labels' in widgetData}
			<p class="text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'}">
				{widgetData.datasets?.length || 0} dataset(s) with {widgetData.labels?.length || 0} points
			</p>
		{:else}
			<p class="text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'}">No data available</p>
		{/if}
		<!-- Integrate Chart.js or similar library here -->
	</div>
</div>
