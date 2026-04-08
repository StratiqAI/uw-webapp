import { defineWidget } from '@stratiqai/dashboard-widget-sdk';
import { mapWidgetDataSchema, mapAiOutputSchema } from './schema.js';
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
        mapType: 'leaflet',
        apiKey: ''
    },
    defaultSize: { colSpan: 8, rowSpan: 4 },
    palette: { icon: '🗺', category: 'content' },
    entityDefinition: { name: 'Map Output', description: 'Structured output for map widgets', outputSchema: mapAiOutputSchema },
    promptConfig: {
        defaultPrompt: 'Determine the geographic coordinates for this property location',
        systemInstruction: 'You are a geolocation assistant. Return latitude, longitude, and an appropriate zoom level for the property.',
        model: 'GEMINI_2_5_FLASH',
        aiOutputSchema: mapAiOutputSchema,
        mapAiOutput: (out) => ({
            lat: out.lat,
            lon: out.lon,
            zoom: out.zoom,
            mapType: 'leaflet',
            apiKey: ''
        })
    }
});
export { mapWidgetDataSchema, mapAiOutputSchema } from './schema.js';
export { default as MapWidget } from './MapWidget.svelte';
