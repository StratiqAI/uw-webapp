import { z } from 'zod';
export const titleWidgetDataSchema = z.object({
    title: z.string(),
    subtitle: z.string().nullable().optional(),
    alignment: z.enum(['left', 'center', 'right']).nullable().optional()
});
export const titleAiOutputSchema = z.object({
    title: z.string().describe('The main title text'),
    subtitle: z.string().nullable().optional().describe('An optional subtitle or tagline')
});
