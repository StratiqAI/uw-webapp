<script lang="ts">
	import type { GaugeWidget } from '$lib/dashboard/types/widget';
	import { useReactiveValidatedTopic } from '$lib/hooks/validatedTopicStoreRunes.svelte';
	import { getWidgetTopic } from '$lib/dashboard/setup/widgetSchemaRegistration';
	import { themeStore } from '$lib/stores/themeStore.svelte';
	import * as d3 from 'd3';

	interface Props {
		data: GaugeWidget['data'];
		widgetId?: string;
		topicOverride?: string;
	}

	let { data, widgetId = 'gauge-widget-default', topicOverride }: Props = $props();

	const darkMode = $derived(themeStore.darkMode);

	const topic = $derived(getWidgetTopic('gauge', widgetId, topicOverride));
	const dataStream = useReactiveValidatedTopic<GaugeWidget['data']>(() => topic);
	const widgetData = $derived<GaugeWidget['data']>(
		dataStream.current ||
			data || {
				value: 0,
				min: 0,
				max: 100
			}
	);

	let containerEl: SVGSVGElement | null = $state(null);

	$effect(() => {
		const value = widgetData?.value ?? 0;
		const min = widgetData?.min ?? 0;
		const max = widgetData?.max ?? 100;
		const label = widgetData?.label ?? '';
		const unit = widgetData?.unit ?? '';
		const color = widgetData?.color ?? '#22c55e';

		if (!containerEl) return;

		d3.select(containerEl).selectAll('*').remove();

		const width = containerEl.clientWidth || 200;
		const height = containerEl.clientHeight || 140;
		const radius = Math.min(width, height * 1.2) / 2 - 10;

		const svg = d3
			.select(containerEl)
			.attr('viewBox', `0 0 ${width} ${height}`)
			.attr('preserveAspectRatio', 'xMidYMid meet');

		const g = svg.append('g').attr('transform', `translate(${width / 2},${height / 2 + radius * 0.15})`);

		// D3 arc: 0 = 12 o'clock, positive angles = clockwise. Top semicircle: 1 o'clock to 11 o'clock
		const scale = d3.scaleLinear().domain([min, max]).range([0, 1]).clamp(true);
		const t = scale(value);
		const startAngle = (1 / 12) * Math.PI * 2;  // 1 o'clock (right side of top)
		const endAngle = (11 / 12) * Math.PI * 2;    // 11 o'clock (left side of top)
		const angleSpan = endAngle - startAngle;

		const arcTrack = d3
			.arc()
			.innerRadius(radius * 0.7)
			.outerRadius(radius)
			.startAngle(startAngle)
			.endAngle(endAngle)
			.cornerRadius(4);

		const valueEndAngle = startAngle + angleSpan * t;
		const arcValue = d3
			.arc()
			.innerRadius(radius * 0.7)
			.outerRadius(radius)
			.startAngle(startAngle)
			.endAngle(valueEndAngle)
			.cornerRadius(4);

		g.append('path')
			.attr('d', arcTrack(null as unknown as d3.DefaultArcObject) ?? '')
			.attr('fill', darkMode ? '#334155' : '#e2e8f0')
			.attr('stroke', darkMode ? '#475569' : '#cbd5e1')
			.attr('stroke-width', 1);

		g.append('path')
			.attr('d', arcValue(null as unknown as d3.DefaultArcObject) ?? '')
			.attr('fill', color)
			.attr('opacity', 0.95);

		// Needle: same angle as value end. D3 uses 0 at 12 o'clock, so point at angle θ is (sin θ, -cos θ) in SVG (y down)
		const needleAngle = valueEndAngle;
		const needleLen = radius * 0.85;
		g.append('line')
			.attr('x1', 0)
			.attr('y1', 0)
			.attr('x2', Math.sin(needleAngle) * needleLen)
			.attr('y2', -Math.cos(needleAngle) * needleLen)
			.attr('stroke', darkMode ? '#94a3b8' : '#475569')
			.attr('stroke-width', 2)
			.attr('stroke-linecap', 'round');

		g.append('circle').attr('r', 5).attr('fill', darkMode ? '#1e293b' : '#0f172a').attr('stroke', darkMode ? '#64748b' : '#475569').attr('stroke-width', 1);

		const textG = svg.append('g').attr('transform', `translate(${width / 2},${height - 20})`);
		textG
			.append('text')
			.attr('text-anchor', 'middle')
			.attr('class', darkMode ? 'fill-slate-200' : 'fill-slate-800')
			.style('font-size', '1.25rem')
			.style('font-weight', '700')
			.text(`${value}${unit}`);
		if (label) {
			textG
				.append('text')
				.attr('text-anchor', 'middle')
				.attr('dy', '1.2em')
				.attr('class', darkMode ? 'fill-slate-400' : 'fill-slate-500')
				.style('font-size', '0.75rem')
				.text(label);
		}

		return () => {
			d3.select(containerEl).selectAll('*').remove();
		};
	});
</script>

<div
	class="gauge-widget h-full min-h-[140px] flex flex-col {darkMode ? 'bg-slate-800/80' : 'bg-white/80'} rounded-xl p-3 shadow-inner"
>
	{#if widgetData != null}
		<div class="flex-1 min-h-0 w-full flex items-center justify-center">
			<svg
				bind:this={containerEl}
				class="w-full h-full"
				style="min-height: 120px;"
			></svg>
		</div>
	{:else}
		<div class="flex-1 flex items-center justify-center">
			<p class="text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'}">No data.</p>
		</div>
	{/if}
</div>
