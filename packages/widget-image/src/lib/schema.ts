import { z } from 'zod';

export const imageWidgetDataSchema = z.object({
	title: z.string().nullable().optional(),
	src: z.string().url(),
	alt: z.string(),
	objectFit: z.enum(['cover', 'contain', 'fill']).nullable().optional()
});

export type ImageWidgetData = z.infer<typeof imageWidgetDataSchema>;

export const imageAiOutputSchema = z.object({
	src: z.string().describe('URL of the image to display'),
	alt: z.string().describe('Alt text describing the image')
});

export type ImageAiOutput = z.infer<typeof imageAiOutputSchema>;
