import { z } from 'zod';

export const sparklineWidgetDataSchema = z.object({
	values: z.array(z.number()),
	label: z.string().nullable().optional(),
	color: z.string().nullable().optional()
});

export type SparklineWidgetData = z.infer<typeof sparklineWidgetDataSchema>;

export const sparklineAiOutputSchema = z.object({
	values: z.array(z.number()).describe('Numeric data points for the sparkline'),
	label: z.string().nullable().optional().describe('Label describing the data trend')
});

export type SparklineAiOutput = z.infer<typeof sparklineAiOutputSchema>;
