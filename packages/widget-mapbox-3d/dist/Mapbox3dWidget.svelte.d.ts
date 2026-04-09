import { type StandardWidgetProps } from '@stratiqai/dashboard-widget-sdk';
import 'mapbox-gl/dist/mapbox-gl.css';
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css';
declare const Mapbox3dWidget: import("svelte").Component<StandardWidgetProps<{
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
}>, {}, "">;
type Mapbox3dWidget = ReturnType<typeof Mapbox3dWidget>;
export default Mapbox3dWidget;
