<!-- src/lib/components/BubbleMap.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	import * as d3 from 'd3';
	import * as topojson from 'topojson-client';

	// Svelte 5 Runes for state management
	let container = $state<HTMLDivElement>();
	let land = $state<any>(null);
	let airports = $state<any[]>([]); // This will be populated from the inline sample data
	let width = $state(928); // Default width

	const height = 500; // Fixed height, aspect ratio is maintained by viewBox

	// --- Inline Sample Airport Data ---
	// The original remote data source is unavailable (404). This sample data provides a demonstration.
	// The passenger numbers are approximate values from recent years.
	const sampleAirports = [
		{ name: 'Hartsfield-Jackson Atlanta', latitude: 33.6407, longitude: -84.4277, passengers: 93700000 },
		{ name: 'Dubai International', latitude: 25.2532, longitude: 55.3657, passengers: 87000000 },
		{ name: 'Dallas/Fort Worth', latitude: 32.8998, longitude: -97.0403, passengers: 73400000 },
		{ name: 'London Heathrow', latitude: 51.4700, longitude: -0.4543, passengers: 79100000 },
		{ name: 'Denver International', latitude: 39.8561, longitude: -104.6737, passengers: 69300000 },
		{ name: 'Charles de Gaulle, Paris', latitude: 49.0097, longitude: 2.5479, passengers: 67300000 },
		{ name: 'Los Angeles International', latitude: 33.9416, longitude: -118.4085, passengers: 66000000 },
		{ name: 'Beijing Capital', latitude: 40.0801, longitude: 116.5845, passengers: 34500000 }, // Lower due to recent events
		{ name: 'Tokyo Haneda', latitude: 35.5494, longitude: 139.7798, passengers: 64200000 },
		{ name: 'Sydney Airport', latitude: -33.9461, longitude: 151.1772, passengers: 44400000 },
		{ name: 'São Paulo/Guarulhos', latitude: -23.4356, longitude: -46.4731, passengers: 43000000 },
		{ name: 'O. R. Tambo, Johannesburg', latitude: -26.1392, longitude: 28.2460, passengers: 21230000 },
		{ name: 'Singapore Changi', latitude: 1.3644, longitude: 103.9915, passengers: 58900000 }
	];

	// --- Data Loading Effect ---
	// This effect runs once to fetch the geographic data and set the airport data.
	$effect(() => {
		async function loadData() {
			const landUrl = 'https://cdn.jsdelivr.net/npm/world-atlas@2/land-50m.json';
			try {
				const landData = await d3.json(landUrl);
				land = landData;
				// Set the airports data from our inline sample array
				airports = sampleAirports;
			} catch (error) {
				console.error('Failed to load map topology data:', error);
			}
		}
		loadData();
	});

	// --- Responsive Width Effect ---
	// This effect updates the width whenever the container is resized.
	$effect(() => {
		if (!container) return;

		const resizeObserver = new ResizeObserver((entries) => {
			width = entries[0].contentRect.width;
		});

		resizeObserver.observe(container);

		return () => {
			resizeObserver.disconnect();
		};
	});

	// --- Derived Values (The Reactive Core) ---
	// These values automatically re-calculate whenever their dependencies change.

	const projection = $derived(
		d3.geoEqualEarth().fitSize([width, height], { type: 'Sphere' })
	);
	const path = $derived(d3.geoPath(projection));
	const landPath = $derived(
		land ? path(topojson.feature(land, land.objects.land)) : ''
	);
	const radius = $derived(
		d3
			.scaleSqrt()
			.domain([0, d3.max(airports, (d) => d.passengers)])
			.range([0, width / 30])
	);

	const bubbles = $derived(
		airports
			.map((d) => {
				const coords = projection([d.longitude, d.latitude]);
				return coords
					? {
							cx: coords[0],
							cy: coords[1],
							r: radius(d.passengers),
							name: d.name,
							passengers: d.passengers
						}
					: null;
			})
			.filter((d): d is NonNullable<typeof d> => d !== null)
			.sort((a, b) => b.passengers - a.passengers)
	);
	
	const legendData = $derived.by(() => {
		const scale = radius.copy();
		// Use values that make sense for the sample data range
		const values = [2e7, 5e7, 1e8]; // 20M, 50M, 100M passengers
		return values.map(value => ({
			value,
			r: scale(value),
			cy: height - 10 - scale(value),
			textY: height - 20 - 2 * scale(value)
		}));
	});

</script>

<div class="bubble-map-container" bind:this={container}>
	{#if land && airports.length > 0}
		<svg {width} {height} viewBox="0 0 {width} {height}" style="max-width: 100%;">
			<!-- Globe Background -->
			<path class="sphere" d={path({ type: 'Sphere' })}></path>

			<!-- Landmasses -->
			<path class="land" d={landPath}></path>

			<!-- Bubbles for Airports -->
			<g class="bubbles">
				{#each bubbles as bubble (bubble.name)}
					<circle cx={bubble.cx} cy={bubble.cy} r={bubble.r}>
						<title>{bubble.name}\n{bubble.passengers.toLocaleString()} passengers</title>
					</circle>
				{/each}
			</g>
			
			<!-- Legend -->
			<g class="legend" transform="translate({width - 120}, 0)">
				<text x="0" y={height - 120} class="legend-title">Passengers</text>
				{#each legendData as item}
					<g transform="translate(50, 0)">
						<circle
							cy={item.cy}
							r={item.r}
							fill="none"
							stroke="#333"
							stroke-dasharray="2,2"
						></circle>
						<line
							y1={item.cy - item.r}
							y2={item.textY}
							stroke="#333"
							stroke-dasharray="2,2"
						></line>
						<text x="6" y={item.textY} dy="0.3em">{d3.format("~s")(item.value)}</text>
					</g>
				{/each}
			</g>
		</svg>
	{:else}
		<p>Loading map data...</p>
	{/if}
</div>

<style>
	.bubble-map-container {
		width: 100%;
		font-family: sans-serif;
	}

	.sphere {
		fill: #f0f8ff; /* A light blue for the ocean */
	}

	.land {
		fill: #ccc;
		stroke: #fff;
		stroke-width: 0.5px;
	}

	.bubbles circle {
		fill: steelblue;
		fill-opacity: 0.5;
		stroke: #fff;
		stroke-width: 0.5px;
		transition: fill-opacity 0.2s;
	}

	.bubbles circle:hover {
		fill-opacity: 0.8;
	}
	
	.legend text {
		font-size: 10px;
		fill: #333;
	}
	
	.legend .legend-title {
		font-weight: bold;
		font-size: 12px;
	}
</style>