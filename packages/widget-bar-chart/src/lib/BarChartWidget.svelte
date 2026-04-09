<script lang="ts">
	import type { BarChartWidgetData } from './schema.js';
	import {
		FlipCard,
		AiStatusOverlay,
		WidgetConfigureBack,
		useWidgetConfigure,
		useReactiveValidatedTopic,
		useAiGenerationStatus,
		getDashboardWidgetHost,
		type StandardWidgetProps
	} from '@stratiqai/dashboard-widget-sdk';
	import { Chart } from '@flowbite-svelte-plugins/chart';

	let {
		data,
		widgetId = 'barchart-widget-default',
		topicOverride,
		darkMode = false,
		theme,
		onUpdateConfig,
		onConfigureReady
	}: StandardWidgetProps<BarChartWidgetData> = $props();

	const host = getDashboardWidgetHost();
	const topic = $derived(host.getWidgetTopic('barChart', widgetId, topicOverride));
	const dataStream = useReactiveValidatedTopic<BarChartWidgetData>(() => topic);
	const aiStatus = useAiGenerationStatus(() => topic);
	const widgetData = $derived<BarChartWidgetData>(
		dataStream.current ||
			data || {
				datasets: [],
				labels: [],
				orientation: 'vertical'
			}
	);

	const configure = useWidgetConfigure<BarChartWidgetData>({
		widgetId: () => widgetId,
		data: () => widgetData,
		get onUpdateConfig() { return onUpdateConfig; },
		get onConfigureReady() { return onConfigureReady; }
	});

	const shellClass = $derived(darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white');
	const flipBackClass = $derived(darkMode ? 'border-slate-600 bg-slate-900' : 'border-slate-200 bg-slate-50');
	const resolvedTheme = $derived(theme ?? (darkMode ? 'dark' : 'light'));

	const chartOptions = $derived.by(() => {
		const labels = widgetData?.labels ?? [];
		const datasets = widgetData?.datasets ?? [];
		const horizontal = widgetData?.orientation === 'horizontal';

		const series = datasets.map((ds) => ({
			name: ds.label,
			color: ds.backgroundColor ?? '#3b82f6',
			data: labels.map((label, i) => ({ x: label, y: ds.data[i] ?? 0 }))
		}));

		return {
			series,
			chart: {
				type: 'bar',
				height: '100%',
				minHeight: 200,
				fontFamily: 'Inter, sans-serif',
				toolbar: { show: false }
			},
			plotOptions: {
				bar: {
					horizontal,
					columnWidth: datasets.length > 1 ? '60%' : '70%',
					borderRadiusApplication: 'end' as const,
					borderRadius: 6
				}
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
			fill: { opacity: 1 }
		};
	});
</script>

<div
	class="bar-chart-widget h-full min-h-[200px] flex flex-col {darkMode ? 'bg-slate-800' : 'bg-slate-50'} rounded p-2"
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
