<!-- LineChart.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';

	interface DataPoint {
		x: number;
		y: number;
		label?: string;
	}

	interface Props {
		data: DataPoint[];
		width?: number;
		height?: number;
		marginTop?: number;
		marginRight?: number;
		marginBottom?: number;
		marginLeft?: number;
		strokeColor?: string;
		strokeWidth?: number;
		showGrid?: boolean;
		showDots?: boolean;
		showTooltip?: boolean;
		animated?: boolean;
		xLabel?: string;
		yLabel?: string;
		title?: string;
	}

	let {
		data = $bindable([]),
		width = 800,
		height = 400,
		marginTop = 40,
		marginRight = 40,
		marginBottom = 60,
		marginLeft = 60,
		strokeColor = '#3b82f6',
		strokeWidth = 2,
		showGrid = true,
		showDots = true,
		showTooltip = true,
		animated = true,
		xLabel = '',
		yLabel = '',
		title = ''
	}: Props = $props();

	// Reactive state
	let svgElement = $state<SVGSVGElement>();
	let hoveredPoint = $state<DataPoint | null>(null);
	let mousePosition = $state({ x: 0, y: 0 });
	let pathLength = $state(0);

	// Derived calculations
	const chartWidth = $derived(width - marginLeft - marginRight);
	const chartHeight = $derived(height - marginTop - marginBottom);

	const xExtent = $derived(() => {
		if (data.length === 0) return [0, 1];
		const values = data.map((d) => d.x);
		return [Math.min(...values), Math.max(...values)];
	});

	const yExtent = $derived(() => {
		if (data.length === 0) return [0, 1];
		const values = data.map((d) => d.y);
		const min = Math.min(...values);
		const max = Math.max(...values);
		const padding = (max - min) * 0.1;
		return [min - padding, max + padding];
	});

	const xScale = $derived((value: number) => {
		const [min, max] = xExtent();
		return ((value - min) / (max - min)) * chartWidth + marginLeft;
	});

	const yScale = $derived((value: number) => {
		const [min, max] = yExtent();
		return height - marginBottom - ((value - min) / (max - min)) * chartHeight;
	});

	const pathData = $derived(() => {
		if (data.length === 0) return '';

		return data
			.map((point, i) => {
				const x = xScale(point.x);
				const y = yScale(point.y);
				return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
			})
			.join(' ');
	});

	const xTicks = $derived(() => {
		const [min, max] = xExtent();
		const tickCount = 5;
		const step = (max - min) / tickCount;
		return Array.from({ length: tickCount + 1 }, (_, i) => min + i * step);
	});

	const yTicks = $derived(() => {
		const [min, max] = yExtent();
		const tickCount = 5;
		const step = (max - min) / tickCount;
		return Array.from({ length: tickCount + 1 }, (_, i) => min + i * step);
	});

	// Event handlers
	function handleMouseMove(event: MouseEvent) {
		if (!showTooltip || !svgElement) return;

		const rect = svgElement.getBoundingClientRect();
		const x = event.clientX - rect.left;
		const y = event.clientY - rect.top;

		mousePosition = { x, y };

		// Find closest data point
		let closestPoint: DataPoint | null = null;
		let minDistance = Infinity;

		data.forEach((point) => {
			const px = xScale(point.x);
			const py = yScale(point.y);
			const distance = Math.sqrt((px - x) ** 2 + (py - y) ** 2);

			if (distance < minDistance && distance < 30) {
				minDistance = distance;
				closestPoint = point;
			}
		});

		hoveredPoint = closestPoint;
	}

	function handleMouseLeave() {
		hoveredPoint = null;
	}

	// Animation effect
	$effect(() => {
		if (animated && svgElement) {
			const path = svgElement.querySelector('.line-path') as SVGPathElement;
			if (path) {
				pathLength = path.getTotalLength();
			}
		}
	});
</script>

<div class="relative inline-block">
	<svg
		bind:this={svgElement}
		{width}
		{height}
		class="overflow-visible"
		on:mousemove={handleMouseMove}
		on:mouseleave={handleMouseLeave}
	>
		<!-- Title -->
		{#if title}
			<text
				x={width / 2}
				y={marginTop / 2}
				class="fill-gray-800 text-lg font-semibold"
				text-anchor="middle"
			>
				{title}
			</text>
		{/if}

		<!-- Grid -->
		{#if showGrid}
			<g class="stroke-gray-200">
				<!-- Vertical grid lines -->
				{#each xTicks as tick}
					<line
						x1={xScale(tick)}
						y1={marginTop}
						x2={xScale(tick)}
						y2={height - marginBottom}
						stroke-dasharray="2,2"
					/>
				{/each}

				<!-- Horizontal grid lines -->
				{#each yTicks as tick}
					<line
						x1={marginLeft}
						y1={yScale(tick)}
						x2={width - marginRight}
						y2={yScale(tick)}
						stroke-dasharray="2,2"
					/>
				{/each}
			</g>
		{/if}

		<!-- Axes -->
		<g class="stroke-gray-600">
			<!-- X-axis -->
			<line
				x1={marginLeft}
				y1={height - marginBottom}
				x2={width - marginRight}
				y2={height - marginBottom}
			/>

			<!-- Y-axis -->
			<line x1={marginLeft} y1={marginTop} x2={marginLeft} y2={height - marginBottom} />
		</g>

		<!-- X-axis ticks and labels -->
		<g class="fill-gray-600 text-sm">
			{#each xTicks as tick}
				<g>
					<line
						x1={xScale(tick)}
						y1={height - marginBottom}
						x2={xScale(tick)}
						y2={height - marginBottom + 5}
						class="stroke-gray-600"
					/>
					<text x={xScale(tick)} y={height - marginBottom + 20} text-anchor="middle">
						{tick.toFixed(1)}
					</text>
				</g>
			{/each}
		</g>

		<!-- Y-axis ticks and labels -->
		<g class="fill-gray-600 text-sm">
			{#each yTicks as tick}
				<g>
					<line
						x1={marginLeft - 5}
						y1={yScale(tick)}
						x2={marginLeft}
						y2={yScale(tick)}
						class="stroke-gray-600"
					/>
					<text x={marginLeft - 10} y={yScale(tick) + 5} text-anchor="end">
						{tick.toFixed(1)}
					</text>
				</g>
			{/each}
		</g>

		<!-- Axis labels -->
		{#if xLabel}
			<text x={width / 2} y={height - 10} class="fill-gray-700 text-sm" text-anchor="middle">
				{xLabel}
			</text>
		{/if}

		{#if yLabel}
			<text
				x={20}
				y={height / 2}
				class="fill-gray-700 text-sm"
				text-anchor="middle"
				transform={`rotate(-90, 20, ${height / 2})`}
			>
				{yLabel}
			</text>
		{/if}

		<!-- Line -->
		<path
			class="line-path fill-none"
			d={pathData}
			stroke={strokeColor}
			stroke-width={strokeWidth}
			stroke-linecap="round"
			stroke-linejoin="round"
			style={animated
				? `
          stroke-dasharray: ${pathLength};
          stroke-dashoffset: ${pathLength};
          animation: draw 1.5s ease-in-out forwards;
        `
				: ''}
		/>

		<!-- Data points -->
		{#if showDots}
			{#each data as point}
				<circle
					cx={xScale(point.x)}
					cy={yScale(point.y)}
					r={hoveredPoint === point ? 6 : 4}
					fill={strokeColor}
					class="transition-all duration-200"
					style={animated
						? `
              opacity: 0;
              animation: fadeIn 0.3s ease-in-out ${1.5 + data.indexOf(point) * 0.05}s forwards;
            `
						: ''}
				/>
			{/each}
		{/if}

		<!-- Hover highlight -->
		{#if hoveredPoint}
			<circle
				cx={xScale(hoveredPoint.x)}
				cy={yScale(hoveredPoint.y)}
				r={8}
				fill="none"
				stroke={strokeColor}
				stroke-width={2}
				class="pointer-events-none"
			/>
		{/if}
	</svg>

	<!-- Tooltip -->
	{#if showTooltip && hoveredPoint}
		<div
			class="pointer-events-none absolute z-10 rounded-lg bg-gray-800 px-3 py-2 text-sm text-white shadow-lg"
			style="
          left: {xScale(hoveredPoint.x)}px;
          top: {yScale(hoveredPoint.y) - 40}px;
          transform: translateX(-50%);
        "
		>
			<div class="font-semibold">
				{hoveredPoint.label || `Point ${data.indexOf(hoveredPoint) + 1}`}
			</div>
			<div class="text-xs">
				X: {hoveredPoint.x.toFixed(2)} | Y: {hoveredPoint.y.toFixed(2)}
			</div>
		</div>
	{/if}
</div>

<style>
	@keyframes draw {
		to {
			stroke-dashoffset: 0;
		}
	}

	@keyframes fadeIn {
		to {
			opacity: 1;
		}
	}
</style>
