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

export const areaChartAiOutputSchema = z.object({
	labels: z.array(z.string()).describe('Labels for each data point on the x-axis'),
	datasets: z.array(z.object({
		label: z.string().describe('Name of the data series'),
		data: z.array(z.number()).describe('Numeric values for each label'),
		color: z.string().nullable().optional().describe('Hex color for the area fill')
	})).describe('One or more stacked area series')
});

export type AreaChartAiOutput = z.infer<typeof areaChartAiOutputSchema>;
