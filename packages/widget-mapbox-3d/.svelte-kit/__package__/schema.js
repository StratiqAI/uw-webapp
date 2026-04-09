import { z } from 'zod';
export const mapbox3dModelSchema = z.object({
    uri: z.string(),
    coordinates: z.tuple([z.number(), z.number()]),
    rotation: z.tuple([z.number(), z.number(), z.number()]).optional(),
    scale: z.tuple([z.number(), z.number(), z.number()]).optional(),
    opacity: z.number().optional(),
    emissiveStrength: z.number().optional(),
    castShadows: z.boolean().optional()
});
export const addressModeSchema = z.enum(['manual', 'ai']).default('ai');
export const mapbox3dConfigSchema = z.object({
    accessToken: z.string().min(1),
    addressMode: addressModeSchema.optional(),
    address: z.string().optional(),
    center: z.tuple([z.number(), z.number()]),
    zoom: z.number(),
    pitch: z.number().optional(),
    bearing: z.number().optional(),
    minZoom: z.number().optional(),
    maxZoom: z.number().optional(),
    style: z.string().optional(),
    lightPreset: z.enum(['dawn', 'day', 'dusk', 'night']).optional(),
    clipPolygon: z.array(z.array(z.tuple([z.number(), z.number()]))).optional(),
    model: mapbox3dModelSchema.optional()
});
export const mapbox3dAiOutputSchema = z.object({
    address: z
        .string()
        .describe('The full street address of the property as found in the document, including street number, street name, city, state, and ZIP code (e.g. "350 5th Ave, New York, NY 10118")'),
    center: z
        .tuple([z.number(), z.number()])
        .describe('Map center [longitude, latitude] corresponding to the extracted address. Derive from the address.'),
    zoom: z.number().describe('Zoom level for the map view, typically 15-17 for a single property'),
    pitch: z.number().optional().describe('Camera pitch angle in degrees, 45 recommended for 3D'),
    bearing: z.number().optional().describe('Camera bearing in degrees')
});
