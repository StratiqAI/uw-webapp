import { type StandardWidgetProps } from '@stratiqai/dashboard-widget-sdk';
declare const MapWidget: import("svelte").Component<StandardWidgetProps<{
    lat: number;
    lon: number;
    zoom: number;
    mapType: "leaflet" | "google" | "mapbox";
    apiKey: string;
    title?: string | null | undefined;
    description?: string | null | undefined;
}>, {}, "">;
type MapWidget = ReturnType<typeof MapWidget>;
export default MapWidget;
