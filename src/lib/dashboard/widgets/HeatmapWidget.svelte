<script lang="ts">
	import type { HeatmapWidget } from '$lib/dashboard/types/widget';
	import { useReactiveValidatedTopic } from '$lib/hooks/validatedTopicStoreRunes.svelte';
	import { getWidgetTopic } from '$lib/dashboard/setup/widgetSchemaRegistration';
	import { themeStore } from '$lib/stores/themeStore.svelte';
	import * as d3 from 'd3';

	interface Props {
		data: HeatmapWidget['data'];
		widgetId?: string;
		topicOverride?: string;
	}

	let { data, widgetId = 'heatmap-widget-default', topicOverride }: Props = $props();

	const darkMode = $derived(themeStore.darkMode);

	const topic = $derived(getWidgetTopic('heatmap', widgetId, topicOverride));
	const dataStream = useReactiveValidatedTopic<HeatmapWidget['data']>(() => topic);
	const widgetData = $derived<HeatmapWidget['data']>(
		dataStream.current ||
			data || {
				rows: [],
				cols: [],
				values: []
			}
	);

	let containerEl: SVGSVGElement | null = $state(null);

	$effect(() => {
		const rows = widgetData?.rows ?? [];
		const cols = widgetData?.cols ?? [];
		const values = widgetData?.values ?? [];

		if (!containerEl || rows.length === 0 || cols.length === 0 || values.length === 0) return;

		d3.select(containerEl).selectAll('*').remove();

		const cellPadding = 2;
		const labelWidth = 56;
		const labelHeight = 20;
		const width = containerEl.clientWidth || 300;
		const height = containerEl.clientHeight || 220;
		const cellW = Math.max(20, (width - labelWidth - 16) / cols.length - cellPadding);
		const cellH = Math.max(16, (height - labelHeight - 16) / rows.length - cellPadding);

		const allValues = values.flat();
		const vMin = d3.min(allValues) ?? 0;
		const vMax = d3.max(allValues) ?? 1;
		const colorScale = d3.scaleSequential(d3.interpolateYlOrRd).domain([vMin, vMax]);

		const svg = d3
			.select(containerEl)
			.attr('viewBox', `0 0 ${width} ${height}`)
			.attr('preserveAspectRatio', 'xMidYMid meet');

		const cellWidth = (width - labelWidth - 16) / cols.length;
		const cellHeight = (height - labelHeight - 16) / rows.length;

		for (let r = 0; r < rows.length; r++) {
			for (let c = 0; c < cols.length; c++) {
				const v = values[r]?.[c] ?? 0;
				const x = labelWidth + 8 + c * cellWidth + cellPadding / 2;
				const y = labelHeight + 8 + r * cellHeight + cellPadding / 2;
				const w = cellWidth - cellPadding;
				const h = cellHeight - cellPadding;
				svg
					.append('rect')
					.attr('x', x)
					.attr('y', y)
					.attr('width', w)
					.attr('height', h)
					.attr('rx', 3)
					.attr('fill', colorScale(v))
					.attr('stroke', darkMode ? '#334155' : '#e2e8f0')
					.attr('stroke-width', 1)
					.style('cursor', 'pointer')
					.append('title')
					.text(`${rows[r]} / ${cols[c]}: ${v}`);
			}
		}

		rows.forEach((row, i) => {
			svg
				.append('text')
				.attr('x', labelWidth)
				.attr('y', labelHeight + 8 + (i + 0.5) * cellHeight)
				.attr('dy', '0.35em')
				.attr('text-anchor', 'end')
				.attr('class', darkMode ? 'fill-slate-300' : 'fill-slate-600')
				.style('font-size', '11px')
				.text(row);
		});
		cols.forEach((col, i) => {
			svg
				.append('text')
				.attr('x', labelWidth + 8 + (i + 0.5) * cellWidth)
				.attr('y', labelHeight + 4)
				.attr('text-anchor', 'middle')
				.attr('class', darkMode ? 'fill-slate-300' : 'fill-slate-600')
				.style('font-size', '11px')
				.text(col);
		});

		return () => {
			d3.select(containerEl).selectAll('*').remove();
		};
	});
</script>

<div
	class="heatmap-widget h-full min-h-[180px] flex flex-col {darkMode ? 'bg-slate-800/80' : 'bg-white/80'} rounded-xl p-3 shadow-inner"
>
	{#if widgetData?.rows?.length && widgetData?.cols?.length && widgetData?.values?.length}
		<div class="flex-1 min-h-0 w-full">
			<svg
				bind:this={containerEl}
				class="w-full h-full"
				style="min-height: 160px;"
			></svg>
		</div>
	{:else}
		<div class="flex-1 flex items-center justify-center">
			<p class="text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'}">Add rows, cols, and values.</p>
		</div>
	{/if}
</div>
