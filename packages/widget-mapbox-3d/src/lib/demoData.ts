import type { Mapbox3dConfig } from './schema.js';

export const DEMO_MAPBOX_3D_CONFIG: Mapbox3dConfig = {
	accessToken: 'YOUR_MAPBOX_TOKEN',
	addressMode: 'ai',
	address: '350 5th Ave, New York, NY 10118',
	center: [-73.9857, 40.7484],
	zoom: 16,
	pitch: 45,
	bearing: -17,
	minZoom: 12,
	maxZoom: 20,
	style: 'mapbox://styles/mapbox/standard',
	lightPreset: 'day'
};
