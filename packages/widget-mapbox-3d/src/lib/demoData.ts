import type { Mapbox3dConfig } from './schema.js';

export const DEMO_MAPBOX_3D_CONFIG: Mapbox3dConfig = {
	accessToken: 'YOUR_MAPBOX_TOKEN',
	center: [-0.126326, 51.533582],
	zoom: 15.27,
	pitch: 42,
	bearing: -50,
	minZoom: 15,
	maxZoom: 16,
	style: 'mapbox://styles/mapbox/standard',
	lightPreset: 'dusk',
	clipPolygon: [
		[
			[-0.12573, 51.53222],
			[-0.12458, 51.53219],
			[-0.12358, 51.53492],
			[-0.12701, 51.53391],
			[-0.12573, 51.53222]
		]
	],
	model: {
		uri: 'https://docs.mapbox.com/mapbox-gl-js/assets/tower.glb',
		coordinates: [-0.12501974, 51.5332374],
		rotation: [0.0, 0.0, 35.0],
		scale: [0.8, 0.8, 1.2],
		opacity: 1,
		emissiveStrength: 0.8,
		castShadows: true
	}
};
