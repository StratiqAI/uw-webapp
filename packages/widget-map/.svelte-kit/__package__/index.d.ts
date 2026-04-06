export declare const mapWidget: import("@stratiqai/dashboard-widget-sdk").WidgetManifest<{
    lat: number;
    lon: number;
    zoom: number;
    mapType: "leaflet" | "google" | "mapbox";
    apiKey: string;
    title?: string | null | undefined;
    description?: string | null | undefined;
}>;
export { mapWidgetDataSchema, mapAiOutputSchema } from './schema.js';
export type { MapWidgetData, MapAiOutput } from './schema.js';
export { default as MapWidget } from './MapWidget.svelte';
