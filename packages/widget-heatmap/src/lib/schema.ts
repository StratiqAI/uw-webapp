import { z } from 'zod';

export const heatmapWidgetDataSchema = z.object({
	rows: z.array(z.string()),
	cols: z.array(z.string()),
	values: z.array(z.array(z.number()))
});

export type HeatmapWidgetData = z.infer<typeof heatmapWidgetDataSchema>;

export const heatmapAiOutputSchema = z.object({
	rows: z.array(z.string()).describe('Row labels (y-axis)'),
	cols: z.array(z.string()).describe('Column labels (x-axis)'),
	values: z.array(z.array(z.number())).describe('2D array of numeric values, rows x cols')
});

export type HeatmapAiOutput = z.infer<typeof heatmapAiOutputSchema>;
