import { z } from 'zod';
export declare const mapWidgetDataSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    lat: z.ZodNumber;
    lon: z.ZodNumber;
    zoom: z.ZodNumber;
    mapType: z.ZodEnum<["leaflet", "google", "mapbox"]>;
    apiKey: z.ZodString;
}, "strip", z.ZodTypeAny, {
    lat: number;
    lon: number;
    zoom: number;
    mapType: "leaflet" | "google" | "mapbox";
    apiKey: string;
    title?: string | null | undefined;
    description?: string | null | undefined;
}, {
    lat: number;
    lon: number;
    zoom: number;
    mapType: "leaflet" | "google" | "mapbox";
    apiKey: string;
    title?: string | null | undefined;
    description?: string | null | undefined;
}>;
export type MapWidgetData = z.infer<typeof mapWidgetDataSchema>;
