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
        defaultPrompt: 'Determine the best 3D map view for this property location',
        systemInstruction: 'You are a geospatial visualization assistant. Return map center coordinates, zoom level, pitch, and bearing for an optimal 3D view.',
        model: 'GEMINI_2_5_FLASH',
        aiOutputSchema: mapbox3dAiOutputSchema,
        mapAiOutput: (out) => ({
            ...DEMO_MAPBOX_3D_CONFIG,
            center: out.center,
            zoom: out.zoom,
            pitch: out.pitch ?? DEMO_MAPBOX_3D_CONFIG.pitch,
            bearing: out.bearing ?? DEMO_MAPBOX_3D_CONFIG.bearing
        })
    }
});
export { mapbox3dConfigSchema, mapbox3dModelSchema, mapbox3dAiOutputSchema } from './schema.js';
export { DEMO_MAPBOX_3D_CONFIG } from './demoData.js';
