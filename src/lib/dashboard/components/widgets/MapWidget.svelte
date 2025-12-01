<!-- src/lib/components/Map.svelte -->
<script lang="ts" module>
	// Declare global Leaflet types
	declare const L: any;
</script>

<script lang="ts">
	import { PUBLIC_GEOAPIFY_API_KEY } from '$env/static/public';
	import type { MapWidget } from '$lib/dashboard/types/widget';
	import { mapStore } from '$lib/stores/MapStore';
	import { useTopic } from '$lib/hooks/mapStoreRunes.svelte';
	import { getWidgetTopic, getWidgetSchemaId } from '$lib/dashboard/setup/widgetSchemaRegistration';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';

	interface Props {
		data: MapWidget['data'];
		widgetId?: string;
		darkMode?: boolean;
	}

	let { data, widgetId = 'map-widget-default', darkMode = false }: Props = $props();
	
	// Use topic naming convention: widget:map:${widgetId}
	const topic = $derived(getWidgetTopic('map', widgetId));
	
	// Subscribe to data updates using useTopic hook
	const dataStream = useTopic(topic, `map-widget-consumer-${widgetId}`);
	let widgetData = $derived(dataStream.current || data);

	// Enforce schema on mount
	onMount(() => {
		if (browser) {
			const schemaId = getWidgetSchemaId('map');
			mapStore.enforceTopicSchema(topic, schemaId);
			console.log(`🗺️ MapWidget:${widgetId} - Schema enforced: ${schemaId} on topic: ${topic}`);
		}
	});

	console.log(`🗺️ MapWidget:${widgetId} - Initialized`);
	console.log(`   Topic: ${topic}`);
	console.log(`   Initial data:`, data);

	const apiKey = PUBLIC_GEOAPIFY_API_KEY;

	// --- DOM Element Reference ---
	let mapContainer: HTMLDivElement; // This will be a reference to the <div> element, bound in the template.

	// Function to fetch and display isoline
	async function addIsolineToMap(map: any, centerLat: number, centerLon: number) {
		try {
			// 5 minutes = 300 seconds
			const range = 300;
			const isolineUrl = `https://api.geoapify.com/v1/isoline?lat=${centerLat}&lon=${centerLon}&type=time&mode=drive&range=${range}&apiKey=${apiKey}`;
			
			console.log('Fetching isoline data from:', isolineUrl);
			
			const response = await fetch(isolineUrl);
			const data = await response.json();
			
			if (response.ok && data.features && data.features.length > 0) {
				console.log('Isoline data received:', data);
				
				// Add the isoline to the map using Leaflet's GeoJSON layer
				L.geoJSON(data, {
					style: function (feature: any) {
						return {
							fillColor: '#3b82f6',
							fillOpacity: 0.3,
							color: '#2563eb',
							weight: 2,
							opacity: 0.8
						};
					}
				}).addTo(map);
				
				console.log('✅ Isoline added to map successfully');
			} else {
				console.error('Failed to fetch isoline data:', data);
			}
		} catch (error) {
			console.error('Error fetching isoline:', error);
		}
	}

	// --- Lifecycle with $effect ---
	// $effect runs after the component mounts. It will automatically re-run if any of its
	// dependencies change (widgetData changes will trigger re-render).
	// Crucially, it provides a way to clean up when the component is destroyed.
	$effect(() => {
		// Ensure the container element is ready and Leaflet is loaded
		if (!mapContainer || typeof L === 'undefined' || !widgetData) {
			return;
		}

		// Get current widget data values (reactive - will update when topic changes)
		const currentLat = widgetData.lat;
		const currentLon = widgetData.lon;
		const currentZoom = widgetData.zoom;

		console.log('===============');
		console.log(currentLat, currentLon, currentZoom);
		console.log('===============');
		// 1. Initialize the Leaflet map, binding it to our <div>
		const map = L.map(mapContainer).setView([currentLat, currentLon], currentZoom);

		// 2. Add the attribution text
		map.attributionControl.setPrefix('').addAttribution('');

		// 3. Create and add the Mapbox GL layer using the Geoapify style
		const gl = L.mapboxGL({
			style: `https://maps.geoapify.com/v1/styles/maptiler-3d/style.json?apiKey=${apiKey}`,
			accessToken: 'no-token' // not needed for Geoapify
		}).addTo(map);

		// 4. Add a marker at the center point
		L.marker([currentLat, currentLon])
			.addTo(map)
			.bindPopup('Center Point')
			.openPopup();

		// 5. Fetch and add the 5-minute drive isoline
		addIsolineToMap(map, currentLat, currentLon);

		// 6. Return a cleanup function
		// This function will be called automatically when the component is unmounted.
		return () => {
			map.remove();
		};
	});
</script>

<!-- 
  This special Svelte element injects its contents into the <head> of the document.
  This is a great way to keep component-specific dependencies together.
-->
<svelte:head>
	<script
		type="text/javascript"
		src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.6.0/leaflet.js"
	></script>
	<script
		type="text/javascript"
		src="https://api.tiles.mapbox.com/mapbox-gl-js/v1.4.0/mapbox-gl.js"
	></script>
	<link
		rel="stylesheet"
		type="text/css"
		href="https://api.tiles.mapbox.com/mapbox-gl-js/v1.4.0/mapbox-gl.css"
	/>
	<link
		rel="stylesheet"
		type="text/css"
		href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.6.0/leaflet.css"
	/>
	<script
		type="text/javascript"
		src="https://rawgit.com/mapbox/mapbox-gl-leaflet/master/leaflet-mapbox-gl.js"
	></script>
</svelte:head>

<!-- 
  The component's markup. We use Tailwind classes for styling.
  'bind:this' gives us a direct reference to the DOM element for use in the script.
-->
<div class="h-full w-full" bind:this={mapContainer}></div>
