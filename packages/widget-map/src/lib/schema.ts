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
