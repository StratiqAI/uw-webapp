import { z } from 'zod';

export const mapWidgetDataSchema = z.object({
	title: z.string().nullable().optional(),
	description: z.string().nullable().optional(),
	lat: z.number().min(-90).max(90),
	lon: z.number().min(-180).max(180),
	zoom: z.number().min(0).max(20),
	mapType: z.enum(['leaflet', 'google', 'mapbox']),
	apiKey: z.string()
});

export type MapWidgetData = z.infer<typeof mapWidgetDataSchema>;

export const mapAiOutputSchema = z.object({
	lat: z.number().describe('Latitude of the map center'),
	lon: z.number().describe('Longitude of the map center'),
	zoom: z.number().describe('Zoom level (0-20)')
});

export type MapAiOutput = z.infer<typeof mapAiOutputSchema>;
