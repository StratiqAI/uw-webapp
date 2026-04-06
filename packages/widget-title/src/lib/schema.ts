import { z } from 'zod';

export const titleWidgetDataSchema = z.object({
	title: z.string(),
	subtitle: z.string().nullable().optional(),
	alignment: z.enum(['left', 'center', 'right']).nullable().optional()
});

export type TitleWidgetData = z.infer<typeof titleWidgetDataSchema>;

export const titleAiOutputSchema = z.object({
	title: z.string().describe('The main title text'),
	subtitle: z.string().nullable().optional().describe('An optional subtitle or tagline')
});

export type TitleAiOutput = z.infer<typeof titleAiOutputSchema>;
