import { z } from 'zod';

export const lineChartWidgetDataSchema = z.object({
	datasets: z.array(
		z.object({
			label: z.string(),
			data: z.array(z.number()),
			color: z.string().nullable().optional()
		})
	),
	labels: z.array(z.string()),
	options: z
		.object({
			responsive: z.boolean().nullable().optional(),
			maintainAspectRatio: z.boolean().nullable().optional()
		})
		.nullable()
		.optional()
});

export type LineChartWidgetData = z.infer<typeof lineChartWidgetDataSchema>;
