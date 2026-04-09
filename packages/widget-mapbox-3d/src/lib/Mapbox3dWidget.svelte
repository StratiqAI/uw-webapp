<script lang="ts">
	import {
		useReactiveValidatedTopic,
		getDashboardWidgetHost,
		type StandardWidgetProps,
		FlipCard,
		WidgetConfigureBack,
		useWidgetConfigure,
		AiStatusOverlay,
		useAiGenerationStatus
	} from '@stratiqai/dashboard-widget-sdk';
	import type { Mapbox3dConfig, AddressMode } from './schema.js';
	import { DEMO_MAPBOX_3D_CONFIG } from './demoData.js';
	import { forwardGeocode } from './geocode.js';
	import { onMount, onDestroy } from 'svelte';
	import 'mapbox-gl/dist/mapbox-gl.css';
	import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css';

	let {
		data,
		widgetId = 'mapbox-3d-default',
		topicOverride,
		darkMode = true,
		theme,
		extraction,
		onUpdateConfig,
		onConfigureReady
	}: StandardWidgetProps<Mapbox3dConfig> = $props();

	const host = getDashboardWidgetHost();
	const topic = () => host.getWidgetTopic('mapbox3d', widgetId, topicOverride);
	const topicData = useReactiveValidatedTopic<Mapbox3dConfig>(topic);
	const aiStatus = useAiGenerationStatus(topic);

	const envToken =
		host.services?.get<{ mapboxAccessToken?: string }>('config')?.mapboxAccessToken ?? '';

	const isRealToken = (t: string | undefined) => !!t && t !== 'YOUR_MAPBOX_TOKEN' && t.length > 10;

	const addressMode = $derived<AddressMode>(data.addressMode ?? 'ai');

	const resolvedAddress = $derived.by<string | undefined>(() => {
		if (addressMode === 'ai') {
			return (
				(extraction?.result?.address as string) ??
				data.address ??
				DEMO_MAPBOX_3D_CONFIG.address
			);
		}
		return data.address ?? DEMO_MAPBOX_3D_CONFIG.address;
	});

	const cfg = $derived<Mapbox3dConfig>({
		...DEMO_MAPBOX_3D_CONFIG,
		...data,
		...(topicData.current ?? {}),
		addressMode,
		address: resolvedAddress,
		accessToken:
			(isRealToken(data.accessToken) ? data.accessToken : undefined) ||
			envToken ||
			DEMO_MAPBOX_3D_CONFIG.accessToken
	});

	const configure = useWidgetConfigure<Mapbox3dConfig>({
		widgetId: () => widgetId,
		data: () => cfg,
		onUpdateConfig: (d) => onUpdateConfig?.(d),
		onConfigureReady: (fn) => onConfigureReady?.(fn)
	});

	const inputFieldClass = $derived(
		darkMode
			? 'w-full rounded-md border border-slate-600 bg-slate-800 px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500'
			: 'w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500'
	);

	const hasToken = $derived(
		cfg.accessToken && cfg.accessToken !== 'YOUR_MAPBOX_TOKEN' && cfg.accessToken.length > 10
	);

	let containerEl = $state<HTMLDivElement | null>(null);
	let mapInstance: any = null;
	let geocoderInstance: any = null;
	let mapLoaded = $state(false);
	let mapError = $state<string | null>(null);
	let lastGeocodedAddress = '';

	async function geocodeAndFly(address: string) {
		if (!mapInstance || !address || address === lastGeocodedAddress) return;
		lastGeocodedAddress = address;

		const result = await forwardGeocode(address, cfg.accessToken);
		if (!result || !mapInstance) return;

		mapInstance.flyTo({
			center: result.center,
			zoom: result.zoom,
			pitch: cfg.pitch ?? 45,
			bearing: cfg.bearing ?? 0,
			essential: true,
			duration: 2000
		});

		onUpdateConfig?.({
			...cfg,
			address,
			center: result.center,
			zoom: result.zoom
		});
	}

	onMount(async () => {
		if (!hasToken || !containerEl) return;

		try {
			const mapboxgl = (await import('mapbox-gl')).default;
			const MapboxGeocoder = (await import('@mapbox/mapbox-gl-geocoder')).default;
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

			const geocoder = new MapboxGeocoder({
				accessToken: cfg.accessToken,
				mapboxgl: mapboxgl as any,
				countries: 'us',
				placeholder: 'Search USA address...',
				marker: true,
				collapsed: true
			});

			map.addControl(geocoder as any, 'top-left');
			geocoderInstance = geocoder;

			geocoder.on('result', (e: { result: { place_name: string; center: number[] } }) => {
				const { place_name, center } = e.result;
				onUpdateConfig?.({
					...cfg,
					address: place_name,
					center: center as [number, number],
					zoom: map.getZoom()
				});
				lastGeocodedAddress = place_name;
			});

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

			if (cfg.address && cfg.address !== DEMO_MAPBOX_3D_CONFIG.address) {
				geocodeAndFly(cfg.address);
			}
		} catch (err: any) {
			mapError = err.message ?? 'Failed to load Mapbox GL';
			console.error('Mapbox init error:', err);
		}
	});

	$effect(() => {
		const address = cfg.address;
		if (mapInstance && address && address !== lastGeocodedAddress) {
			geocodeAndFly(address);
		}
	});

	$effect(() => {
		const center = cfg.center;
		const zoom = cfg.zoom;
		if (mapInstance && center && mapLoaded) {
			const currentCenter = mapInstance.getCenter();
			const dx = Math.abs(currentCenter.lng - center[0]);
			const dy = Math.abs(currentCenter.lat - center[1]);
			if (dx > 0.0001 || dy > 0.0001) {
				mapInstance.flyTo({
					center,
					zoom,
					pitch: cfg.pitch ?? 0,
					bearing: cfg.bearing ?? 0,
					essential: true,
					duration: 1500
				});
			}
		}
	});

	onDestroy(() => {
		if (mapInstance) {
			mapInstance.remove();
			mapInstance = null;
		}
		geocoderInstance = null;
	});

	const shell = $derived(
		darkMode
			? 'bg-slate-900 text-slate-100 border-slate-700'
			: 'bg-white text-slate-900 border-slate-200'
	);
	const muted = $derived(darkMode ? 'text-slate-400' : 'text-slate-700');
	const borderColor = $derived(darkMode ? 'border-slate-700' : 'border-slate-200');

	const flipShellClass = $derived(
		darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'
	);
	const flipBackClass = $derived(
		darkMode ? 'border-slate-600 bg-slate-900' : 'border-slate-200 bg-slate-50'
	);

	const labelClass = $derived(
		darkMode
			? 'mb-1 block text-xs font-medium text-slate-400'
			: 'mb-1 block text-xs font-medium text-slate-500'
	);

	const draftIsAi = $derived(configure.draft.addressMode !== 'manual');

	function toggleAddressMode() {
		configure.draft.addressMode = draftIsAi ? 'manual' : 'ai';
	}
</script>

<FlipCard
	isFlipped={configure.isFlipped}
	shellClass={flipShellClass}
	flipBackClass={flipBackClass}
>
	{#snippet front()}
		{#if aiStatus.generating || aiStatus.error}
			<div class="flex h-full items-center justify-center px-4 py-4">
				<AiStatusOverlay generating={aiStatus.generating} error={aiStatus.error} {darkMode} />
			</div>
		{:else}
		<div class="flex h-full flex-col overflow-hidden rounded-lg border shadow-sm {shell}">
			<div class="shrink-0 border-b px-4 py-2.5 {borderColor}">
				<h2 class="text-[10px] font-semibold uppercase tracking-wider {muted}">
					Mapbox 3D Model Viewer
				</h2>
				{#if cfg.address}
					<p class="mt-0.5 truncate text-xs {muted}">{cfg.address}</p>
				{/if}
			</div>

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
		{/if}
	{/snippet}
	{#snippet back()}
		<WidgetConfigureBack
			showAITab={draftIsAi}
			kind="mapbox3d"
			widgetId={widgetId}
			darkMode={darkMode}
			theme={theme}
			topicOverride={topicOverride}
			onApply={() => configure.applyConfig()}
			onCancel={() => configure.cancelConfig()}
		>
			{#snippet userFields()}
				<!-- Address source toggle -->
				<div class="space-y-2">
					<span class={labelClass}>Address Source</span>
					<div class="flex items-center gap-3">
						<button
							type="button"
							onclick={toggleAddressMode}
							class="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 {draftIsAi
								? 'bg-indigo-500'
								: darkMode ? 'bg-slate-600' : 'bg-slate-300'}"
							role="switch"
							aria-checked={draftIsAi}
							aria-label="Toggle address source between AI and manual"
						>
							<span
								class="pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out {draftIsAi ? 'translate-x-4' : 'translate-x-0'}"
							></span>
						</button>
						<span class="text-xs {darkMode ? 'text-slate-300' : 'text-slate-700'}">
							{#if draftIsAi}
								<span class="font-medium text-indigo-400">AI from documents</span>
								<span class={muted}> — address extracted from uploaded files</span>
							{:else}
								<span class="font-medium">Manual entry</span>
								<span class={muted}> — type or search an address</span>
							{/if}
						</span>
					</div>
				</div>

				{#if !draftIsAi}
					<label class="block">
						<span class={labelClass}>Address</span>
						<input
							type="text"
							bind:value={configure.draft.address}
							class={inputFieldClass}
							placeholder="123 Main St, City, ST 00000"
						/>
					</label>
				{:else}
					<div class="rounded-md border px-3 py-2 {darkMode ? 'border-slate-600 bg-slate-800/50' : 'border-slate-200 bg-slate-50'}">
						<p class="text-xs {muted}">
							{#if cfg.address && cfg.address !== DEMO_MAPBOX_3D_CONFIG.address}
								Discovered: <span class={darkMode ? 'text-slate-200' : 'text-slate-800'}>{cfg.address}</span>
							{:else}
								Run extraction from the AI tab to discover the property address from your documents.
							{/if}
						</p>
					</div>
				{/if}

				<label class="block">
					<span class={labelClass}>Zoom</span>
					<input type="number" step="any" bind:value={configure.draft.zoom} class={inputFieldClass} />
				</label>
				<label class="block">
					<span class={labelClass}>Pitch</span>
					<input type="number" step="any" bind:value={configure.draft.pitch} class={inputFieldClass} />
				</label>
				<label class="block">
					<span class={labelClass}>Bearing</span>
					<input type="number" step="any" bind:value={configure.draft.bearing} class={inputFieldClass} />
				</label>
				<label class="block">
					<span class={labelClass}>Style</span>
					<input type="text" bind:value={configure.draft.style} class={inputFieldClass} />
				</label>
			{/snippet}
		</WidgetConfigureBack>
	{/snippet}
</FlipCard>

<style>
	.mapbox-container {
		width: 100%;
		height: 100%;
	}
</style>
