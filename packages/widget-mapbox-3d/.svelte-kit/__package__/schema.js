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
export const mapbox3dConfigSchema = z.object({
    accessToken: z.string().min(1),
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
