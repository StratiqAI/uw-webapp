import { defineWidget } from '@stratiqai/dashboard-widget-sdk';
import { mapbox3dConfigSchema, mapbox3dAiOutputSchema } from './schema.js';
import Mapbox3dWidget from './Mapbox3dWidget.svelte';
import { DEMO_MAPBOX_3D_CONFIG } from './demoData.js';

export const mapbox3dWidget = defineWidget({
	kind: 'mapbox3d',
	displayName: 'Mapbox 3D Model',
	zodSchema: mapbox3dConfigSchema,
	component: Mapbox3dWidget,
	defaultData: DEMO_MAPBOX_3D_CONFIG,
	defaultSize: { colSpan: 8, rowSpan: 5 },
	palette: { icon: '🗺', category: 'map' },
	entityDefinition: {
		name: 'Mapbox 3D Model Output',
		description: 'Structured output for mapbox 3D widgets',
		outputSchema: mapbox3dAiOutputSchema
	},
	promptConfig: {
		defaultPrompt:
			'What is the full street address or property address shown in the document? Include the street number, street name, city, state, and ZIP code. Then determine the best 3D map view coordinates for that address.',
		systemInstruction:
			'You are a commercial real estate document analyst. Search the provided document pages for the property address. ' +
			'Look for the street address, city, state, and ZIP code — these are commonly found on cover pages, headers, property summaries, or offering memorandum title pages. ' +
			'Return the full address exactly as written in the document along with the geographic coordinates (longitude, latitude) for that address and appropriate map view parameters.',
		model: 'GEMINI_2_5_FLASH',
		aiOutputSchema: mapbox3dAiOutputSchema,
		mapAiOutput: (out) => ({
			...DEMO_MAPBOX_3D_CONFIG,
			address: out.address,
			center: out.center,
			zoom: out.zoom as number,
			pitch: out.pitch ?? DEMO_MAPBOX_3D_CONFIG.pitch,
			bearing: out.bearing ?? DEMO_MAPBOX_3D_CONFIG.bearing
		})
	}
});

export type { Mapbox3dConfig, Mapbox3dModel, Mapbox3dAiOutput, AddressMode } from './schema.js';
export {
	mapbox3dConfigSchema,
	mapbox3dModelSchema,
	mapbox3dAiOutputSchema,
	addressModeSchema
} from './schema.js';
export { DEMO_MAPBOX_3D_CONFIG } from './demoData.js';
export { forwardGeocode } from './geocode.js';
