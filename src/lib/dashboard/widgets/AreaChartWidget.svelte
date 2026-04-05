<script lang="ts">
	import type { AreaChartWidget } from '$lib/dashboard/types/widget';
	import { useReactiveValidatedTopic } from '$lib/hooks/validatedTopicStoreRunes.svelte';
	import { getWidgetTopic } from '$lib/dashboard/setup/widgetSchemaRegistration';
	import * as d3 from 'd3';
	import { themeStore } from '$lib/stores/themeStore.svelte';

	interface Props {
		data: AreaChartWidget['data'];
		widgetId?: string;
		topicOverride?: string;
	}

	let { data, widgetId = 'area-widget-default', topicOverride }: Props = $props();
	const darkMode = $derived(themeStore.darkMode);

	const topic = $derived(getWidgetTopic('areaChart', widgetId, topicOverride));
	const dataStream = useReactiveValidatedTopic<AreaChartWidget['data']>(() => topic);
	const widgetData = $derived<AreaChartWidget['data']>(
		dataStream.current ||
			data || {
				labels: [],
				datasets: []
			}
	);

	let containerEl: SVGSVGElement | null = $state(null);

	$effect(() => {
		const labels = widgetData?.labels ?? [];
		const datasets = widgetData?.datasets ?? [];

		if (!containerEl || labels.length === 0 || datasets.length === 0) return;

		const margin = { top: 20, right: 16, bottom: 28, left: 40 };
		const width = (containerEl.clientWidth || 320) - margin.left - margin.right;
		const height = (containerEl.clientHeight || 200) - margin.top - margin.bottom;

		d3.select(containerEl).selectAll('*').remove();

		const svg = d3
			.select(containerEl)
			.attr('viewBox', `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
			.attr('preserveAspectRatio', 'xMidYMid meet');

		const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

		const seriesKeys = datasets.map((d) => d.label);
		const colors = datasets.map((d) => d.color ?? '#06b6d4');
		const dataStack = labels.map((label, i) => {
			const row: Record<string, string | number> = { label };
			datasets.forEach((ds) => {
				row[ds.label] = ds.data[i] ?? 0;
			});
			return row;
		});

		const stack = d3.stack<Record<string, string | number>>().keys(seriesKeys).order(d3.stackOrderNone).offset(d3.stackOffsetNone);
		const stacked = stack(dataStack);

		const xScale = d3.scaleBand().domain(labels).range([0, width]).padding(0.2);
		const yMax = d3.max(stacked[stacked.length - 1], (d) => (d[1] as number)) ?? 1;
		const yScale = d3.scaleLinear().domain([0, yMax * 1.05]).range([height, 0]);

		// Gradients for each series
		const defs = svg.append('defs');
		stacked.forEach((_, i) => {
			const grad = defs
				.append('linearGradient')
				.attr('id', `area-gradient-${widgetId}-${i}`)
				.attr('x1', 0)
				.attr('x2', 0)
				.attr('y1', 0)
				.attr('y2', 1);
			grad.append('stop').attr('offset', '0%').attr('stop-color', colors[i]).attr('stop-opacity', 0.7);
			grad.append('stop').attr('offset', '100%').attr('stop-color', colors[i]).attr('stop-opacity', 0.08);
		});

		const area = d3
			.area<d3.SeriesPoint<Record<string, string | number>>>()
			.x((_, i) => (xScale(labels[i]) ?? 0) + xScale.bandwidth() / 2)
			.y0((d) => yScale(d[0] as number))
			.y1((d) => yScale(d[1] as number))
			.curve(d3.curveMonotoneX);

		g.selectAll('path')
			.data(stacked)
			.join('path')
			.attr('fill', (_, i) => `url(#area-gradient-${widgetId}-${i})`)
			.attr('stroke', (_, i) => colors[i])
			.attr('stroke-width', 2)
			.attr('stroke-linejoin', 'round')
			.attr('d', area);

		// X axis
		const xAxis = g
			.append('g')
			.attr('transform', `translate(0,${height})`)
			.call(d3.axisBottom(xScale).tickSize(0).tickPadding(8));
		xAxis.selectAll('text').attr('class', darkMode ? 'fill-slate-400' : 'fill-slate-500').style('font-size', '10px');
		xAxis.select('.domain').attr('stroke', darkMode ? '#475569' : '#e2e8f0');

		// Y axis
		const yAxis = g.call(d3.axisLeft(yScale).ticks(5).tickSize(-width).tickFormat((v) => String(v)));
		yAxis.selectAll('text').attr('class', darkMode ? 'fill-slate-400' : 'fill-slate-500').style('font-size', '10px');
		yAxis.selectAll('.tick line').attr('stroke', darkMode ? '#334155' : '#f1f5f9');
		yAxis.select('.domain').attr('stroke', darkMode ? '#475569' : '#e2e8f0');

		return () => {
			d3.select(containerEl).selectAll('*').remove();
		};
	});
</script>

<div
	class="area-chart-widget h-full min-h-[200px] flex flex-col {darkMode ? 'bg-slate-800/80' : 'bg-white/80'} rounded-xl p-3 shadow-inner"
>
	{#if widgetData?.labels?.length && widgetData?.datasets?.length}
		<div class="flex-1 min-h-0 w-full">
			<svg
				bind:this={containerEl}
				class="w-full h-full"
				style="min-height: 180px;"
			></svg>
		</div>
	{:else}
		<div class="flex-1 flex items-center justify-center">
			<p class="text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'}">
				No data. Add labels and datasets to this widget.
			</p>
		</div>
	{/if}
</div>
