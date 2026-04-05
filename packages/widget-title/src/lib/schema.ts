import { z } from 'zod';

export const titleWidgetDataSchema = z.object({
	title: z.string(),
	subtitle: z.string().nullable().optional(),
	alignment: z.enum(['left', 'center', 'right']).nullable().optional()
});

export type TitleWidgetData = z.infer<typeof titleWidgetDataSchema>;
