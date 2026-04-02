<script lang="ts">
	import {
		useReactiveValidatedTopic,
		getDashboardWidgetHost,
		type StandardWidgetProps
	} from '@stratiqai/dashboard-widget-sdk';
	import type { Mapbox3dConfig } from './schema.js';
	import { DEMO_MAPBOX_3D_CONFIG } from './demoData.js';
	import { onMount, onDestroy } from 'svelte';
	import 'mapbox-gl/dist/mapbox-gl.css';

	let {
		data,
		widgetId = 'mapbox-3d-default',
		topicOverride,
		darkMode = true,
		onUpdateConfig
	}: StandardWidgetProps<Mapbox3dConfig> = $props();

	const host = getDashboardWidgetHost();
	const topic = () => host.getWidgetTopic('mapbox3d', widgetId, topicOverride);
	const topicData = useReactiveValidatedTopic<Mapbox3dConfig>(topic);

	const cfg = $derived<Mapbox3dConfig>({
		...DEMO_MAPBOX_3D_CONFIG,
		...data,
		...(topicData.current ?? {}),
		accessToken: data.accessToken || DEMO_MAPBOX_3D_CONFIG.accessToken
	});

	const hasToken = $derived(
		cfg.accessToken && cfg.accessToken !== 'YOUR_MAPBOX_TOKEN' && cfg.accessToken.length > 10
	);

	let containerEl = $state<HTMLDivElement | null>(null);
	let mapInstance: any = null;
	let mapLoaded = $state(false);
	let mapError = $state<string | null>(null);

	onMount(async () => {
		if (!hasToken || !containerEl) return;

		try {
			const mapboxgl = (await import('mapbox-gl')).default;
			(mapboxgl as any).accessToken = cfg.accessToken;

			const map = new mapboxgl.Map({
				container: containerEl,
				center: cfg.center as [number, number],
				zoom: cfg.zoom,
				pitch: cfg.pitch ?? 0,
				bearing: cfg.bearing ?? 0,
				style: cfg.style ?? 'mapbox://styles/mapbox/standard',
				minZoom: cfg.minZoom,
				maxZoom: cfg.maxZoom,
				attributionControl: false
			});

			map.addControl(new mapboxgl.NavigationControl(), 'top-right');

			map.on('style.load', () => {
				if (cfg.lightPreset) {
					map.setConfigProperty('basemap', 'lightPreset', cfg.lightPreset);
				}

				if (cfg.clipPolygon) {
					map.addSource('eraser', {
						type: 'geojson',
						data: {
							type: 'FeatureCollection',
							features: [
								{
									type: 'Feature',
									properties: {},
									geometry: {
										type: 'Polygon',
										coordinates: cfg.clipPolygon
									}
								}
							]
						}
					});

					map.addLayer({
						id: 'eraser',
						type: 'clip' as any,
						source: 'eraser',
						layout: {
							'clip-layer-types': ['symbol', 'model'],
							'clip-layer-scope': ['basemap']
						} as any
					});
				}

				if (cfg.model) {
					map.addSource('model', {
						type: 'geojson',
						data: {
							type: 'Feature',
							properties: {
								'model-uri': cfg.model.uri
							},
							geometry: {
								type: 'Point',
								coordinates: cfg.model.coordinates
							}
						}
					});

					map.addLayer({
						id: 'custom-model',
						type: 'model' as any,
						slot: 'middle',
						source: 'model',
						minzoom: cfg.minZoom ?? 15,
						layout: {
							'model-id': ['get', 'model-uri']
						} as any,
						paint: {
							'model-opacity': cfg.model.opacity ?? 1,
							'model-rotation': cfg.model.rotation ?? [0, 0, 0],
							'model-scale': cfg.model.scale ?? [1, 1, 1],
							'model-color-mix-intensity': 0,
							'model-cast-shadows': cfg.model.castShadows ?? true,
							'model-emissive-strength': cfg.model.emissiveStrength ?? 0.8
						} as any
					});
				}

				mapLoaded = true;
			});

			map.on('error', (e: any) => {
				console.error('Mapbox error:', e.error?.message ?? e);
			});

			mapInstance = map;
		} catch (err: any) {
			mapError = err.message ?? 'Failed to load Mapbox GL';
			console.error('Mapbox init error:', err);
		}
	});

	onDestroy(() => {
		if (mapInstance) {
			mapInstance.remove();
			mapInstance = null;
		}
	});

	const shell = $derived(
		darkMode
			? 'bg-slate-900 text-slate-100 border-slate-700'
			: 'bg-white text-slate-900 border-slate-200'
	);
	const muted = $derived(darkMode ? 'text-slate-400' : 'text-slate-700');
	const borderColor = $derived(darkMode ? 'border-slate-700' : 'border-slate-200');
</script>

<div class="flex h-full flex-col overflow-hidden rounded-lg border shadow-sm {shell}">
	<!-- Header -->
	<div class="shrink-0 border-b px-4 py-2.5 {borderColor}">
		<h2 class="text-[10px] font-semibold uppercase tracking-wider {muted}">
			Mapbox 3D Model Viewer
		</h2>
	</div>

	<!-- Map container -->
	<div class="relative min-h-0 flex-1">
		{#if !hasToken}
			<div class="flex h-full items-center justify-center p-6">
				<div class="rounded-lg border p-6 text-center {darkMode ? 'bg-slate-800/80 border-slate-600' : 'bg-slate-50 border-slate-200'}">
					<p class="text-sm font-semibold">Mapbox Access Token Required</p>
					<p class="mt-2 text-xs {muted}">
						Set <code class="rounded px-1 py-0.5 text-[11px] {darkMode ? 'bg-slate-700 text-cyan-300' : 'bg-slate-100 text-cyan-700'}">PUBLIC_MAPBOX_ACCESS_TOKEN</code> in your <code class="rounded px-1 py-0.5 text-[11px] {darkMode ? 'bg-slate-700 text-cyan-300' : 'bg-slate-100 text-cyan-700'}">.env</code> file and restart the dev server.
					</p>
				</div>
			</div>
		{:else if mapError}
			<div class="flex h-full items-center justify-center p-6">
				<div class="rounded-lg border p-6 text-center {darkMode ? 'bg-slate-800/80 border-rose-600/50' : 'bg-rose-50 border-rose-200'}">
					<p class="text-sm font-semibold {darkMode ? 'text-rose-400' : 'text-rose-700'}">Map Error</p>
					<p class="mt-2 text-xs {muted}">{mapError}</p>
				</div>
			</div>
		{:else}
			<div
				bind:this={containerEl}
				class="mapbox-container"
			></div>
			{#if !mapLoaded}
				<div class="absolute inset-0 z-10 flex items-center justify-center {darkMode ? 'bg-slate-900/80' : 'bg-white/80'}">
					<div class="flex items-center gap-2 text-sm {muted}">
						<svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
							<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3"></circle>
							<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
						</svg>
						Loading map...
					</div>
				</div>
			{/if}
		{/if}
	</div>
</div>

<style>
	.mapbox-container {
		width: 100%;
		height: 100%;
	}
</style>
