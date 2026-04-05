export declare const mapbox3dWidget: import("@stratiqai/dashboard-widget-sdk").WidgetManifest<{
    accessToken: string;
    center: [number, number];
    zoom: number;
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
export type { Mapbox3dConfig, Mapbox3dModel } from './schema.js';
export { mapbox3dConfigSchema, mapbox3dModelSchema } from './schema.js';
export { DEMO_MAPBOX_3D_CONFIG } from './demoData.js';
