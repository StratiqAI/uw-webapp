<script lang="ts">
	import type { SparklineWidget } from '$lib/dashboard/types/widget';
	import { useReactiveValidatedTopic } from '$lib/hooks/validatedTopicStoreRunes.svelte';
	import { getWidgetTopic } from '$lib/dashboard/setup/widgetSchemaRegistration';
	import * as d3 from 'd3';

	interface Props {
		data: SparklineWidget['data'];
		widgetId?: string;
		topicOverride?: string;
		darkMode?: boolean;
	}

	let { data, widgetId = 'sparkline-widget-default', topicOverride, darkMode = false }: Props = $props();

	const topic = $derived(getWidgetTopic('sparkline', widgetId, topicOverride));
	const dataStream = useReactiveValidatedTopic<SparklineWidget['data']>(() => topic);
	const widgetData = $derived<SparklineWidget['data']>(
		dataStream.current ||
			data || {
				values: []
			}
	);

	let containerEl: SVGSVGElement | null = $state(null);

	$effect(() => {
		const values = widgetData?.values ?? [];
		const label = widgetData?.label ?? '';
		const color = widgetData?.color ?? '#3b82f6';

		if (!containerEl || values.length < 2) return;

		d3.select(containerEl).selectAll('*').remove();

		const width = containerEl.clientWidth || 280;
		const height = containerEl.clientHeight || 56;
		const padding = { top: 6, right: 6, bottom: label ? 18 : 6, left: 6 };
		const innerWidth = width - padding.left - padding.right;
		const innerHeight = height - padding.top - padding.bottom;

		const svg = d3
			.select(containerEl)
			.attr('viewBox', `0 0 ${width} ${height}`)
			.attr('preserveAspectRatio', 'xMidYMid meet');

		const xScale = d3.scaleLinear().domain([0, values.length - 1]).range([0, innerWidth]);
		const yMin = d3.min(values) ?? 0;
		const yMax = d3.max(values) ?? 1;
		const yScale = d3.scaleLinear().domain([yMin, yMax]).range([innerHeight, 0]).nice();

		const area = d3
			.area<number>()
			.x((_, i) => xScale(i))
			.y0(innerHeight)
			.y1((d) => yScale(d))
			.curve(d3.curveMonotoneX);

		const line = d3
			.line<number>()
			.x((_, i) => xScale(i))
			.y((d) => yScale(d))
			.curve(d3.curveMonotoneX);

		const g = svg.append('g').attr('transform', `translate(${padding.left},${padding.top})`);

		g.append('path').attr('d', area(values)).attr('fill', color).attr('opacity', 0.2);
		g.append('path').attr('d', line(values)).attr('fill', 'none').attr('stroke', color).attr('stroke-width', 2).attr('stroke-linecap', 'round').attr('stroke-linejoin', 'round');

		if (label) {
			svg
				.append('text')
				.attr('x', padding.left)
				.attr('y', height - 4)
				.attr('class', darkMode ? 'fill-slate-400' : 'fill-slate-500')
				.style('font-size', '11px')
				.text(label);
		}

		return () => {
			d3.select(containerEl).selectAll('*').remove();
		};
	});
</script>

<div
	class="sparkline-widget h-full min-h-[48px] flex flex-col {darkMode ? 'bg-slate-800/80' : 'bg-white/80'} rounded-xl p-2 shadow-inner border {darkMode ? 'border-slate-700' : 'border-slate-200'}"
>
	{#if widgetData?.values?.length >= 2}
		<div class="flex-1 min-h-0 w-full">
			<svg
				bind:this={containerEl}
				class="w-full h-full"
				style="min-height: 40px;"
			></svg>
		</div>
	{:else}
		<div class="flex-1 flex items-center justify-center">
			<p class="text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'}">Add at least 2 values.</p>
		</div>
	{/if}
</div>
