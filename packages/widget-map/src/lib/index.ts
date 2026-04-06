import { defineWidget } from '@stratiqai/dashboard-widget-sdk';
import { mapWidgetDataSchema } from './schema.js';
import MapWidget from './MapWidget.svelte';

export const mapWidget = defineWidget({
	kind: 'map',
	displayName: 'Map',
	zodSchema: mapWidgetDataSchema,
	component: MapWidget,
	defaultData: {
		title: null,
		description: null,
		lat: 37.7749,
		lon: -122.4194,
		zoom: 10,
		mapType: 'leaflet' as const,
		apiKey: ''
	},
	defaultSize: { colSpan: 8, rowSpan: 4 },
	palette: { icon: '🗺', category: 'content' }
});

export { mapWidgetDataSchema } from './schema.js';
export type { MapWidgetData } from './schema.js';
export { default as MapWidget } from './MapWidget.svelte';
