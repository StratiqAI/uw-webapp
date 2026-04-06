import { z } from 'zod';

export const jsonViewerWidgetDataSchema = z.object({
	title: z.string().nullable().optional(),
	description: z.string().nullable().optional(),
	json: z.unknown()
});

export type JsonViewerWidgetData = z.infer<typeof jsonViewerWidgetDataSchema>;

export const jsonViewerAiOutputSchema = z.object({
	data: z.record(z.unknown()).describe('Structured JSON data to display in the viewer')
});

export type JsonViewerAiOutput = z.infer<typeof jsonViewerAiOutputSchema>;
