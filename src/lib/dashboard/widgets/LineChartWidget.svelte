<script lang="ts">
	import type { LineChartWidget } from '$lib/dashboard/types/widget';
	import { useReactiveValidatedTopic } from '$lib/hooks/validatedTopicStoreRunes.svelte';
	import { getWidgetTopic } from '$lib/dashboard/setup/widgetSchemaRegistration';
	import { Chart } from '@flowbite-svelte-plugins/chart';
	import { themeStore } from '$lib/stores/themeStore.svelte';

	interface Props {
		data: LineChartWidget['data'];
		widgetId?: string;
		topicOverride?: string;
	}

	let { data, widgetId = 'linechart-widget-default', topicOverride }: Props = $props();
	const darkMode = $derived(themeStore.darkMode);

	// Use topic override if provided, otherwise use default topic naming convention
	const topic = $derived(getWidgetTopic('lineChart', widgetId, topicOverride));

	// Subscribe to data updates using ValidatedTopicStore hook (reactive to topic changes)
	const dataStream = useReactiveValidatedTopic<LineChartWidget['data']>(() => topic);

	// Merge store data with prop data, with safe fallbacks
	const widgetData = $derived<LineChartWidget['data']>(
		dataStream.current ||
			data || {
				datasets: [],
				labels: []
			}
	);

	// Build Flowbite Chart options from widget data (ApexCharts-style, type: line)
	const chartOptions = $derived.by(() => {
		const labels = widgetData?.labels ?? [];
		const datasets = widgetData?.datasets ?? [];

		const series = datasets.map((ds) => ({
			name: ds.label,
			color: ds.color ?? '#3b82f6',
			data: labels.map((label, i) => ({ x: label, y: ds.data[i] ?? 0 }))
		}));

		return {
			series,
			chart: {
				type: 'line' as const,
				height: '100%',
				minHeight: 200,
				fontFamily: 'Inter, sans-serif',
				toolbar: { show: false },
				zoom: { enabled: false }
			},
			stroke: {
				curve: 'smooth' as const,
				width: 2
			},
			tooltip: {
				shared: true,
				intersect: false
			},
			grid: {
				show: true,
				strokeDashArray: 4,
				padding: { left: 8, right: 8, top: 4, bottom: 4 }
			},
			dataLabels: { enabled: false },
			legend: {
				show: datasets.length > 1,
				position: 'top' as const,
				labels: {
					colors: darkMode ? '#94a3b8' : '#64748b'
				}
			},
			xaxis: {
				labels: {
					show: true,
					style: {
						cssClass: darkMode
							? 'text-xs fill-slate-400'
							: 'text-xs fill-slate-500'
					}
				},
				axisBorder: { show: false },
				axisTicks: { show: false }
			},
			yaxis: {
				show: true,
				labels: {
					style: {
						cssClass: darkMode
							? 'text-xs fill-slate-400'
							: 'text-xs fill-slate-500'
					}
				}
			},
			markers: {
				size: 4,
				hover: { size: 6 }
			}
		};
	});
</script>

<div
	class="line-chart-widget h-full min-h-[200px] flex flex-col {darkMode ? 'bg-slate-800' : 'bg-slate-50'} rounded p-2"
>
	{#if widgetData?.labels?.length && widgetData?.datasets?.length}
		<div class="chart-container flex-1 min-h-0 w-full">
			<Chart options={chartOptions} />
		</div>
	{:else}
		<div class="flex-1 flex items-center justify-center">
			<p class="text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'}">
				No data yet. Add data to this widget via the topic store or defaults.
			</p>
		</div>
	{/if}
</div>
