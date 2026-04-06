import { z } from 'zod';

export const areaChartWidgetDataSchema = z.object({
	labels: z.array(z.string()),
	datasets: z.array(
		z.object({
			label: z.string(),
			data: z.array(z.number()),
			color: z.string().nullable().optional()
		})
	)
});

export type AreaChartWidgetData = z.infer<typeof areaChartWidgetDataSchema>;
