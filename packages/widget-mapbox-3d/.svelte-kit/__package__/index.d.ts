export declare const mapbox3dWidget: import("@stratiqai/dashboard-widget-sdk").WidgetManifest<{
    accessToken: string;
    center: [number, number];
    zoom: number;
    addressMode?: "manual" | "ai" | undefined;
    address?: string | undefined;
    pitch?: number | undefined;
    bearing?: number | undefined;
    minZoom?: number | undefined;
    maxZoom?: number | undefined;
    style?: string | undefined;
    lightPreset?: "dawn" | "day" | "dusk" | "night" | undefined;
    clipPolygon?: [number, number][][] | undefined;
    model?: {
        uri: string;
        coordinates: [number, number];
        rotation?: [number, number, number] | undefined;
        scale?: [number, number, number] | undefined;
        opacity?: number | undefined;
        emissiveStrength?: number | undefined;
        castShadows?: boolean | undefined;
    } | undefined;
}>;
export type { Mapbox3dConfig, Mapbox3dModel, Mapbox3dAiOutput, AddressMode } from './schema.js';
export { mapbox3dConfigSchema, mapbox3dModelSchema, mapbox3dAiOutputSchema, addressModeSchema } from './schema.js';
export { DEMO_MAPBOX_3D_CONFIG } from './demoData.js';
export { forwardGeocode } from './geocode.js';
