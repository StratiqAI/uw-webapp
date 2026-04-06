import { z } from 'zod';

export const divergingBarChartWidgetDataSchema = z.object({
	labels: z.array(z.string()),
	values: z.array(z.number()),
	positiveColor: z.string().nullable().optional(),
	negativeColor: z.string().nullable().optional()
});

export type DivergingBarChartWidgetData = z.infer<typeof divergingBarChartWidgetDataSchema>;

export const divergingBarChartAiOutputSchema = z.object({
	labels: z.array(z.string()).describe('Category labels for each bar'),
	values: z.array(z.number()).describe('Positive and negative numeric values for each label')
});

export type DivergingBarChartAiOutput = z.infer<typeof divergingBarChartAiOutputSchema>;
