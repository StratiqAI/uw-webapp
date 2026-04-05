<script lang="ts">
	import type { DonutChartWidget } from '$lib/dashboard/types/widget';
	import { useReactiveValidatedTopic } from '$lib/hooks/validatedTopicStoreRunes.svelte';
	import { getWidgetTopic } from '$lib/dashboard/setup/widgetSchemaRegistration';
	import * as d3 from 'd3';
	import { themeStore } from '$lib/stores/themeStore.svelte';

	interface Props {
		data: DonutChartWidget['data'];
		widgetId?: string;
		topicOverride?: string;
	}

	let { data, widgetId = 'donut-widget-default', topicOverride }: Props = $props();
	const darkMode = $derived(themeStore.darkMode);

	const topic = $derived(getWidgetTopic('donutChart', widgetId, topicOverride));
	const dataStream = useReactiveValidatedTopic<DonutChartWidget['data']>(() => topic);
	const widgetData = $derived<DonutChartWidget['data']>(
		dataStream.current ||
			data || {
				labels: [],
				values: []
			}
	);

	let containerEl: SVGSVGElement | null = $state(null);

	const DEFAULT_COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#c084fc', '#d8b4fe', '#e9d5ff'];

	$effect(() => {
		const labels = widgetData?.labels ?? [];
		const values = widgetData?.values ?? [];
		const colors = widgetData?.colors ?? DEFAULT_COLORS;
		const centerLabel = widgetData?.centerLabel ?? '';

		if (!containerEl || labels.length === 0 || values.length === 0) return;

		const total = values.reduce((a, b) => a + b, 0);
		const dataPie = labels.map((label, i) => ({ label, value: values[i], color: colors[i] ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length] }));

		// Clear previous
		d3.select(containerEl).selectAll('*').remove();

		const width = containerEl.clientWidth || 280;
		const height = containerEl.clientHeight || 220;
		const radius = Math.min(width, height) / 2 - 12;
		const innerRadius = radius * 0.6;

		const svg = d3
			.select(containerEl)
			.attr('viewBox', `0 0 ${width} ${height}`)
			.attr('preserveAspectRatio', 'xMidYMid meet');

		const g = svg.append('g').attr('transform', `translate(${width / 2},${height / 2})`);

		const pie = d3
			.pie<{ label: string; value: number; color: string }>()
			.value((d) => d.value)
			.sort(null)
			.padAngle(0.012);

		const arc = d3
			.arc<d3.PieArcDatum<{ label: string; value: number; color: string }>>()
			.innerRadius(innerRadius)
			.outerRadius(radius)
			.cornerRadius(6);

		const arcs = g
			.selectAll('path')
			.data(pie(dataPie))
			.join('path')
			.attr('fill', (d) => d.data.color)
			.attr('stroke', darkMode ? '#1e293b' : '#f8fafc')
			.attr('stroke-width', 2)
			.attr('opacity', 0.95)
			.attr('d', arc)
			.style('cursor', 'pointer')
			.on('mouseenter', function () {
				d3.select(this).attr('opacity', 1).attr('stroke-width', 3);
			})
			.on('mouseleave', function () {
				d3.select(this).attr('opacity', 0.95).attr('stroke-width', 2);
			});

		// Center text
		const center = g.append('g').attr('text-anchor', 'middle');
		center
			.append('text')
			.attr('dy', centerLabel ? '-0.2em' : '0')
			.attr('class', darkMode ? 'fill-slate-200' : 'fill-slate-700')
			.style('font-size', '0.85rem')
			.style('font-weight', '600')
			.text(centerLabel || '');
		center
			.append('text')
			.attr('dy', centerLabel ? '0.6em' : '0.35em')
			.attr('class', darkMode ? 'fill-slate-400' : 'fill-slate-500')
			.style('font-size', '0.7rem')
			.text(total.toLocaleString());

		// Legend
		const legend = svg
			.append('g')
			.attr('transform', `translate(8, ${height - 28})`)
			.selectAll('g')
			.data(dataPie)
			.join('g')
			.attr('transform', (_, i) => `translate(${i * 72}, 0)`);
		legend
			.append('rect')
			.attr('width', 10)
			.attr('height', 10)
			.attr('rx', 2)
			.attr('fill', (d) => d.color);
		legend
			.append('text')
			.attr('x', 14)
			.attr('y', 9)
			.attr('class', darkMode ? 'fill-slate-300' : 'fill-slate-600')
			.style('font-size', '10px')
			.text((d) => d.label);

		return () => {
			d3.select(containerEl).selectAll('*').remove();
		};
	});
</script>

<div
	class="donut-chart-widget h-full min-h-[200px] flex flex-col {darkMode ? 'bg-slate-800/80' : 'bg-white/80'} rounded-xl p-3 shadow-inner"
>
	{#if widgetData?.labels?.length && widgetData?.values?.length}
		<div class="flex-1 min-h-0 w-full flex items-center justify-center">
			<svg
				bind:this={containerEl}
				class="w-full h-full max-h-[240px]"
				style="min-height: 180px;"
			></svg>
		</div>
	{:else}
		<div class="flex-1 flex items-center justify-center">
			<p class="text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'}">
				No data. Add labels and values to this widget.
			</p>
		</div>
	{/if}
</div>
