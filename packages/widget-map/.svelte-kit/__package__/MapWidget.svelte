<script lang="ts" module>
	const CDN_SCRIPTS = [
		{ src: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.6.0/leaflet.js', type: 'js' },
		{ src: 'https://api.tiles.mapbox.com/mapbox-gl-js/v1.4.0/mapbox-gl.js', type: 'js' },
		{ src: 'https://cdn.jsdelivr.net/npm/mapbox-gl-leaflet@0.0.16/leaflet-mapbox-gl.js', type: 'js' }
	] as const;

	const CDN_STYLES = [
		'https://api.tiles.mapbox.com/mapbox-gl-js/v1.4.0/mapbox-gl.css',
		'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.6.0/leaflet.css'
	] as const;

	let cdnLoaded = false;

	function loadCdnResources(): Promise<void> {
		if (cdnLoaded) return Promise.resolve();
		if (typeof document === 'undefined') return Promise.resolve();

		const promises: Promise<void>[] = [];

		for (const href of CDN_STYLES) {
			if (!document.querySelector(`link[href="${href}"]`)) {
				const link = document.createElement('link');
				link.rel = 'stylesheet';
				link.href = href;
				document.head.appendChild(link);
			}
		}

		for (const { src } of CDN_SCRIPTS) {
			if (!document.querySelector(`script[src="${src}"]`)) {
				promises.push(
					new Promise((resolve, reject) => {
						const script = document.createElement('script');
						script.src = src;
						script.onload = () => resolve();
						script.onerror = reject;
						document.head.appendChild(script);
					})
				);
			}
		}

		return Promise.all(promises).then(() => {
			cdnLoaded = true;
		});
	}

	function leafletGlobal(): any {
		return (globalThis as unknown as { L?: any }).L;
	}
</script>

<script lang="ts">
	import type { MapWidgetData } from './schema.js';
	import {
		FlipCard,
		AiStatusOverlay,
		WidgetConfigureBack,
		useWidgetConfigure,
		useReactiveValidatedTopic,
		useAiGenerationStatus,
		getDashboardWidgetHost,
		HostServices,
		type StandardWidgetProps,
		type HostConfig
	} from '@stratiqai/dashboard-widget-sdk';

	let {
		data,
		widgetId = 'map-widget-default',
		topicOverride,
		darkMode = false,
		theme,
		onUpdateConfig,
		onConfigureReady
	}: StandardWidgetProps<MapWidgetData> = $props();

	const host = getDashboardWidgetHost();
	const topic = $derived(host.getWidgetTopic('map', widgetId, topicOverride));
	const dataStream = useReactiveValidatedTopic<MapWidgetData>(() => topic);
	const aiStatus = useAiGenerationStatus(() => topic);
	let widgetData = $derived<MapWidgetData>(dataStream.current || data);

	const configure = useWidgetConfigure<MapWidgetData>({
		data: () => widgetData,
		get onUpdateConfig() { return onUpdateConfig; },
		get onConfigureReady() { return onConfigureReady; }
	});

	const shellClass = $derived(darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white');
	const flipBackClass = $derived(darkMode ? 'border-slate-600 bg-slate-900' : 'border-slate-200 bg-slate-50');
	const resolvedTheme = $derived(theme ?? (darkMode ? 'dark' : 'light'));

	const hostConfig = host.services?.get<HostConfig>(HostServices.CONFIG);
	const apiKey = $derived(widgetData.apiKey || hostConfig?.geoapifyApiKey || '');

	let mapContainer = $state<HTMLDivElement | null>(null);
	let scriptsReady = $state(false);

	$effect(() => {
		loadCdnResources().then(() => {
			scriptsReady = true;
		});
	});

	async function addIsolineToMap(map: any, centerLat: number, centerLon: number) {
		const L = leafletGlobal();
		if (!apiKey || !L) return;
		try {
			const range = 300;
			const isolineUrl = `https://api.geoapify.com/v1/isoline?lat=${centerLat}&lon=${centerLon}&type=time&mode=drive&range=${range}&apiKey=${apiKey}`;
			const response = await fetch(isolineUrl);
			const isoData = await response.json();

			if (response.ok && isoData.features?.length > 0) {
				L.geoJSON(isoData, {
					style: () => ({
						fillColor: '#3b82f6',
						fillOpacity: 0.3,
						color: '#2563eb',
						weight: 2,
						opacity: 0.8
					})
				}).addTo(map);
			}
		} catch {
			// Isoline fetch failed silently
		}
	}

	$effect(() => {
		const L = leafletGlobal();
		if (!mapContainer || !scriptsReady || typeof L === 'undefined' || !widgetData) return;

		const currentLat = widgetData.lat;
		const currentLon = widgetData.lon;
		const currentZoom = widgetData.zoom;

		const map = L.map(mapContainer).setView([currentLat, currentLon], currentZoom);
		map.attributionControl.setPrefix('').addAttribution('');

		if (apiKey) {
			L.mapboxGL({
				style: `https://maps.geoapify.com/v1/styles/maptiler-3d/style.json?apiKey=${apiKey}`,
				accessToken: 'no-token'
			}).addTo(map);
		}

		L.marker([currentLat, currentLon]).addTo(map).bindPopup('Center Point').openPopup();

		addIsolineToMap(map, currentLat, currentLon);

		return () => {
			map.remove();
		};
	});
</script>

<FlipCard isFlipped={configure.isFlipped} {shellClass} {flipBackClass}>
	{#snippet front()}
		<div class="h-full w-full">
			{#if aiStatus.generating || aiStatus.error}
				<div class="flex h-full items-center justify-center px-4 py-4">
					<AiStatusOverlay generating={aiStatus.generating} error={aiStatus.error} {darkMode} />
				</div>
			{:else}
				<div class="h-full w-full" bind:this={mapContainer}></div>
			{/if}
		</div>
	{/snippet}
	{#snippet back()}
		<WidgetConfigureBack
			kind="map"
			{widgetId}
			{darkMode}
			theme={resolvedTheme}
			{topicOverride}
			showAITab={true}
			onApply={() => configure.applyConfig()}
			onCancel={configure.cancelConfig}
		/>
	{/snippet}
</FlipCard>
