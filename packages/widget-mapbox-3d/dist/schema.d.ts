import { z } from 'zod';
export declare const mapbox3dModelSchema: z.ZodObject<{
    uri: z.ZodString;
    coordinates: z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>;
    rotation: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber], null>>;
    scale: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber], null>>;
    opacity: z.ZodOptional<z.ZodNumber>;
    emissiveStrength: z.ZodOptional<z.ZodNumber>;
    castShadows: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    uri: string;
    coordinates: [number, number];
    rotation?: [number, number, number] | undefined;
    scale?: [number, number, number] | undefined;
    opacity?: number | undefined;
    emissiveStrength?: number | undefined;
    castShadows?: boolean | undefined;
}, {
    uri: string;
    coordinates: [number, number];
    rotation?: [number, number, number] | undefined;
    scale?: [number, number, number] | undefined;
    opacity?: number | undefined;
    emissiveStrength?: number | undefined;
    castShadows?: boolean | undefined;
}>;
export type Mapbox3dModel = z.infer<typeof mapbox3dModelSchema>;
export declare const mapbox3dConfigSchema: z.ZodObject<{
    accessToken: z.ZodString;
    center: z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>;
    zoom: z.ZodNumber;
    pitch: z.ZodOptional<z.ZodNumber>;
    bearing: z.ZodOptional<z.ZodNumber>;
    minZoom: z.ZodOptional<z.ZodNumber>;
    maxZoom: z.ZodOptional<z.ZodNumber>;
    style: z.ZodOptional<z.ZodString>;
    lightPreset: z.ZodOptional<z.ZodEnum<["dawn", "day", "dusk", "night"]>>;
    clipPolygon: z.ZodOptional<z.ZodArray<z.ZodArray<z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>, "many">, "many">>;
    model: z.ZodOptional<z.ZodObject<{
        uri: z.ZodString;
        coordinates: z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>;
        rotation: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber], null>>;
        scale: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber], null>>;
        opacity: z.ZodOptional<z.ZodNumber>;
        emissiveStrength: z.ZodOptional<z.ZodNumber>;
        castShadows: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        uri: string;
        coordinates: [number, number];
        rotation?: [number, number, number] | undefined;
        scale?: [number, number, number] | undefined;
        opacity?: number | undefined;
        emissiveStrength?: number | undefined;
        castShadows?: boolean | undefined;
    }, {
        uri: string;
        coordinates: [number, number];
        rotation?: [number, number, number] | undefined;
        scale?: [number, number, number] | undefined;
        opacity?: number | undefined;
        emissiveStrength?: number | undefined;
        castShadows?: boolean | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
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
}, {
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
export type Mapbox3dConfig = z.infer<typeof mapbox3dConfigSchema>;
