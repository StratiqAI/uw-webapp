import { defineWidget } from '@stratiqai/dashboard-widget-sdk';
import { mapbox3dConfigSchema } from './schema.js';
import Mapbox3dWidget from './Mapbox3dWidget.svelte';
import { DEMO_MAPBOX_3D_CONFIG } from './demoData.js';
export const mapbox3dWidget = defineWidget({
    kind: 'mapbox3d',
    displayName: 'Mapbox 3D Model',
    zodSchema: mapbox3dConfigSchema,
    component: Mapbox3dWidget,
    defaultData: DEMO_MAPBOX_3D_CONFIG,
    defaultSize: { colSpan: 8, rowSpan: 5 },
    palette: { icon: '🗺', category: 'map' }
});
export { mapbox3dConfigSchema, mapbox3dModelSchema } from './schema.js';
export { DEMO_MAPBOX_3D_CONFIG } from './demoData.js';
