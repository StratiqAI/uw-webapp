import { z } from 'zod';

export const donutChartWidgetDataSchema = z.object({
	labels: z.array(z.string()),
	values: z.array(z.number()),
	colors: z.array(z.string()).nullable().optional(),
	centerLabel: z.string().nullable().optional()
});

export type DonutChartWidgetData = z.infer<typeof donutChartWidgetDataSchema>;

export const donutChartAiOutputSchema = z.object({
	labels: z.array(z.string()).describe('Category labels for each slice'),
	values: z.array(z.number()).describe('Numeric values for each slice'),
	colors: z.array(z.string()).nullable().optional().describe('Hex colors for each slice'),
	centerLabel: z.string().nullable().optional().describe('Label displayed in the center of the donut')
});

export type DonutChartAiOutput = z.infer<typeof donutChartAiOutputSchema>;
