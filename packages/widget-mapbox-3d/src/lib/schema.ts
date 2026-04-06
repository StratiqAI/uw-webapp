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

export type Mapbox3dModel = z.infer<typeof mapbox3dModelSchema>;

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

export type Mapbox3dConfig = z.infer<typeof mapbox3dConfigSchema>;

export const mapbox3dAiOutputSchema = z.object({
	center: z.tuple([z.number(), z.number()]).describe('Map center [longitude, latitude]'),
	zoom: z.number().describe('Zoom level'),
	pitch: z.number().optional().describe('Camera pitch angle in degrees'),
	bearing: z.number().optional().describe('Camera bearing in degrees')
});

export type Mapbox3dAiOutput = z.infer<typeof mapbox3dAiOutputSchema>;
