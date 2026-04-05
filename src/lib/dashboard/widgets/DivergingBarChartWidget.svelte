<script lang="ts">
	import type { DivergingBarChartWidget } from '$lib/dashboard/types/widget';
	import { useReactiveValidatedTopic } from '$lib/hooks/validatedTopicStoreRunes.svelte';
	import { getWidgetTopic } from '$lib/dashboard/setup/widgetSchemaRegistration';
	import { themeStore } from '$lib/stores/themeStore.svelte';
	import * as d3 from 'd3';

	interface Props {
		data: DivergingBarChartWidget['data'];
		widgetId?: string;
		topicOverride?: string;
	}

	let { data, widgetId = 'diverging-barchart-widget-default', topicOverride }: Props = $props();

	const darkMode = $derived(themeStore.darkMode);

	const topic = $derived(getWidgetTopic('divergingBarChart', widgetId, topicOverride));
	const dataStream = useReactiveValidatedTopic<DivergingBarChartWidget['data']>(() => topic);
	const widgetData = $derived<DivergingBarChartWidget['data']>(
		dataStream.current ??
			data ?? {
				labels: [],
				values: []
			}
	);

	const hasData = $derived(
		Array.isArray(widgetData?.labels) &&
			widgetData.labels.length > 0 &&
			Array.isArray(widgetData?.values) &&
			widgetData.values.length > 0
	);

	let containerEl: SVGSVGElement | null = $state(null);
	let containerSize = $state({ w: 0, h: 0 });

	const POSITIVE_COLOR = '#3b82f6';
	const NEGATIVE_COLOR = '#ef4444';

	$effect(() => {
		const el = containerEl;
		if (!el || !hasData) return;
		const ro = new ResizeObserver((entries) => {
			const { width, height } = entries[0]?.contentRect ?? { width: 0, height: 0 };
			containerSize = { w: width, h: height };
		});
		ro.observe(el);
		return () => ro.disconnect();
	});

	$effect(() => {
		if (!hasData || !containerEl) return;
		// Re-run when data or container size changes
		const _ = containerSize.w + containerSize.h;

		const labels = widgetData?.labels ?? [];
		const values = widgetData?.values ?? [];
		const positiveColor = widgetData?.positiveColor ?? POSITIVE_COLOR;
		const negativeColor = widgetData?.negativeColor ?? NEGATIVE_COLOR;

		// Trim to same length
		const n = Math.min(labels.length, values.length);
		const dataItems = Array.from({ length: n }, (_, i) => ({
			label: labels[i],
			value: values[i]
		}));

		d3.select(containerEl).selectAll('*').remove();

		const margin = { top: 12, right: 24, bottom: 28, left: 120 };
		const width = Math.max(containerSize.w || containerEl.clientWidth || 0, 320);
		const height = Math.max(containerSize.h || containerEl.clientHeight || 0, 200);
		const innerWidth = width - margin.left - margin.right;
		const innerHeight = height - margin.top - margin.bottom;

		const maxAbs = Math.max(
			...(dataItems.map((d) => Math.abs(d.value))),
			1
		);
		const xDomain: [number, number] = [-maxAbs, maxAbs];

		const xScale = d3
			.scaleLinear()
			.domain(xDomain)
			.range([0, innerWidth])
			.nice();

		const yScale = d3
			.scaleBand()
			.domain(dataItems.map((d) => d.label))
			.range([0, innerHeight])
			.padding(0.25);

		const xZero = xScale(0);
		const barHeight = yScale.bandwidth();

		const svg = d3
			.select(containerEl)
			.attr('viewBox', `0 0 ${width} ${height}`)
			.attr('preserveAspectRatio', 'xMidYMid meet');

		const g = svg
			.append('g')
			.attr('transform', `translate(${margin.left},${margin.top})`);

		// Center line at zero
		g.append('line')
			.attr('x1', xZero)
			.attr('x2', xZero)
			.attr('y1', 0)
			.attr('y2', innerHeight)
			.attr('stroke', darkMode ? '#475569' : '#94a3b8')
			.attr('stroke-width', 1)
			.attr('stroke-dasharray', '4,2');

		// Bars
		g.selectAll('rect')
			.data(dataItems)
			.join('rect')
			.attr('y', (d) => yScale(d.label) ?? 0)
			.attr('height', barHeight)
			.attr('x', (d) => (d.value >= 0 ? xZero : xScale(d.value)))
			.attr('width', (d) => Math.abs(xScale(d.value) - xZero))
			.attr('fill', (d) => (d.value >= 0 ? positiveColor : negativeColor))
			.attr('rx', 2)
			.attr('ry', 2)
			.style('cursor', 'pointer')
			.on('mouseenter', function () {
				d3.select(this).attr('opacity', 0.85);
			})
			.on('mouseleave', function () {
				d3.select(this).attr('opacity', 1);
			})
			.append('title')
			.text((d) => `${d.label}: ${d.value}`);

		// Y-axis (labels)
		g.selectAll('.y-label')
			.data(dataItems)
			.join('text')
			.attr('class', 'y-label')
			.attr('x', -8)
			.attr('y', (d) => (yScale(d.label) ?? 0) + barHeight / 2)
			.attr('dy', '0.35em')
			.attr('text-anchor', 'end')
			.attr('class', darkMode ? 'fill-slate-300' : 'fill-slate-600')
			.style('font-size', '11px')
			.text((d) => d.label);

		// X-axis
		const xAxis = d3.axisBottom(xScale).ticks(5);
		g.append('g')
			.attr('transform', `translate(0,${innerHeight})`)
			.call(xAxis)
			.attr('class', darkMode ? 'fill-slate-400' : 'fill-slate-500')
			.style('font-size', '10px');
		return () => {
			if (containerEl) d3.select(containerEl).selectAll('*').remove();
		};
	});
</script>

<div
	class="diverging-bar-widget h-full min-h-[200px] flex flex-col {darkMode ? 'bg-slate-800/80' : 'bg-white/80'} rounded-xl p-3 shadow-inner border {darkMode ? 'border-slate-700' : 'border-slate-200'}"
>
	{#if hasData}
		<div class="flex-1 min-h-0 w-full flex items-center justify-center">
			<svg
				bind:this={containerEl}
				class="w-full h-full overflow-visible"
				style="min-height: 180px;"
				aria-label="Diverging bar chart"
			></svg>
		</div>
	{:else}
		<div class="flex-1 flex items-center justify-center min-h-[120px]">
			<p class="text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'}">
				No data. Add labels and values to this widget.
			</p>
		</div>
	{/if}
</div>
