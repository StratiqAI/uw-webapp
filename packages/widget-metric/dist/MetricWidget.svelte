<script lang="ts">
	import type { MetricWidgetData } from './schema.js';
	import { useReactiveValidatedTopic, getDashboardWidgetHost } from '@stratiqai/dashboard-widget-sdk';

	interface Props {
		data: MetricWidgetData;
		widgetId?: string;
		topicOverride?: string;
		darkMode?: boolean;
	}

	let { data, widgetId = 'metric-widget-default', topicOverride, darkMode = false }: Props = $props();

	const host = getDashboardWidgetHost();
	const topic = $derived(host.getWidgetTopic('metric', widgetId, topicOverride));
	const dataStream = useReactiveValidatedTopic<MetricWidgetData>(() => topic);
	let widgetData = $derived<MetricWidgetData>(dataStream.current || data);
</script>

<div class="metric-widget h-full flex flex-col justify-center">
	<p class="text-sm {darkMode ? 'text-slate-300' : 'text-slate-600'} mb-1">{widgetData.label}</p>
	<p class="text-3xl font-bold {darkMode ? 'text-slate-100' : 'text-slate-900'}">
	Right 	{widgetData.value}{widgetData.unit ? ` ${widgetData.unit}` : ''}
	</p>
	{#if widgetData.change != null}
		<p class="text-sm mt-2 flex items-center {widgetData.changeType === 'increase' ? (darkMode ? 'text-green-400' : 'text-green-600') : (darkMode ? 'text-red-400' : 'text-red-600')}">
			{#if widgetData.changeType === 'increase'}
				<svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
					<path fill-rule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clip-rule="evenodd"></path>
				</svg>
			{:else}
				<svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
					<path fill-rule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
				</svg>
			{/if}
			{Math.abs(widgetData.change)}%
		</p>
	{/if}
</div>
