<script lang="ts">
	import type { BarChartWidget } from '$lib/dashboard/types/widget';
	import { useReactiveValidatedTopic } from '$lib/hooks/validatedTopicStoreRunes.svelte';
	import { getWidgetTopic } from '$lib/dashboard/setup/widgetSchemaRegistration';

	interface Props {
		data: BarChartWidget['data'];
		widgetId?: string;
		topicOverride?: string;
		darkMode?: boolean;
	}

	let { data, widgetId = 'barchart-widget-default', topicOverride, darkMode = false }: Props = $props();
	
	// Use topic override if provided, otherwise use default topic naming convention
	const topic = $derived(getWidgetTopic('barChart', widgetId, topicOverride));
	
	// Subscribe to data updates using ValidatedTopicStore hook (reactive to topic changes)
	const dataStream = useReactiveValidatedTopic<BarChartWidget['data']>(() => topic);
	
	// Merge store data with prop data, with safe fallbacks
	let widgetData = $derived<BarChartWidget['data']>(dataStream.current || data || {
		datasets: [],
		labels: [],
		orientation: 'vertical'
	});

	$effect(() => {
		console.log(`📊 BarChartWidget:${widgetId} - Initialized with ValidatedTopicStore`);
		console.log(`   Topic: ${topic}`);
		console.log(`   Initial data:`, data);
	});
	
	// Note: You'll need to integrate with a charting library like Chart.js
	// This is a placeholder implementation
</script>
  
<div class="bar-chart-widget h-full flex items-center justify-center {darkMode ? 'bg-slate-800' : 'bg-slate-50'} rounded">
	<div class="text-center">
		<p class="{darkMode ? 'text-slate-300' : 'text-slate-600'} mb-2">Bar Chart ({widgetData?.orientation || 'vertical'})</p>
		<p class="text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'}">
			{widgetData?.datasets?.length || 0} dataset(s) with {widgetData?.labels?.length || 0} bars
		</p>
		<!-- Integrate Chart.js or similar library here -->
	</div>
</div>
