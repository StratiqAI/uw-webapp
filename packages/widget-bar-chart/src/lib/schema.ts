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

export const barChartAiOutputSchema = z.object({
	labels: z.array(z.string()).describe('Category labels for the x-axis'),
	datasets: z.array(z.object({
		label: z.string().describe('Name of the data series'),
		data: z.array(z.number()).describe('Numeric values for each label'),
		backgroundColor: z.string().nullable().optional().describe('Hex color for the bars')
	})).describe('One or more data series'),
	orientation: z.enum(['vertical', 'horizontal']).nullable().optional().describe('Bar orientation')
});

export type BarChartAiOutput = z.infer<typeof barChartAiOutputSchema>;
