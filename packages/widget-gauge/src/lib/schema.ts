import { z } from 'zod';

export const gaugeWidgetDataSchema = z.object({
	value: z.number(),
	min: z.number().nullable().optional(),
	max: z.number().nullable().optional(),
	label: z.string().nullable().optional(),
	unit: z.string().nullable().optional(),
	color: z.string().nullable().optional()
});

export type GaugeWidgetData = z.infer<typeof gaugeWidgetDataSchema>;

export const gaugeAiOutputSchema = z.object({
	value: z.number().describe('Current gauge value'),
	min: z.number().nullable().optional().describe('Minimum scale value'),
	max: z.number().nullable().optional().describe('Maximum scale value'),
	label: z.string().nullable().optional().describe('Label describing what the gauge measures'),
	unit: z.string().nullable().optional().describe('Unit of measurement')
});

export type GaugeAiOutput = z.infer<typeof gaugeAiOutputSchema>;
