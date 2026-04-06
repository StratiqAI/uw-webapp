import { z } from 'zod';

export const barChartWidgetDataSchema = z.object({
	datasets: z.array(
		z.object({
			label: z.string(),
			data: z.array(z.number()),
			backgroundColor: z.string().nullable().optional()
		})
	),
	labels: z.array(z.string()),
	orientation: z.enum(['vertical', 'horizontal']).nullable().optional()
});

export type BarChartWidgetData = z.infer<typeof barChartWidgetDataSchema>;
