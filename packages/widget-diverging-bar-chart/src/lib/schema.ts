import { z } from 'zod';

export const divergingBarChartWidgetDataSchema = z.object({
	labels: z.array(z.string()),
	values: z.array(z.number()),
	positiveColor: z.string().nullable().optional(),
	negativeColor: z.string().nullable().optional()
});

export type DivergingBarChartWidgetData = z.infer<typeof divergingBarChartWidgetDataSchema>;
