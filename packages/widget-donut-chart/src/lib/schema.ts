import { z } from 'zod';

export const donutChartWidgetDataSchema = z.object({
	labels: z.array(z.string()),
	values: z.array(z.number()),
	colors: z.array(z.string()).nullable().optional(),
	centerLabel: z.string().nullable().optional()
});

export type DonutChartWidgetData = z.infer<typeof donutChartWidgetDataSchema>;
