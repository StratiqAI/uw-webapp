import { z } from 'zod';
export const metricWidgetDataSchema = z.object({
    /** Displayed in the widget card's header strip by the host dashboard. */
    title: z.string().nullable().optional(),
    /** Shown as a subtitle line beneath the title in the header strip. */
    description: z.string().nullable().optional(),
    label: z.string(),
    value: z.union([z.string(), z.number()]),
    change: z.number().nullable().optional(),
    changeType: z.enum(['increase', 'decrease']).nullable().optional(),
    unit: z.string().nullable().optional()
});
export const metricAiOutputSchema = z.object({
    label: z.string().describe('Short label describing the metric'),
    value: z.union([z.string(), z.number()]).describe('The metric value'),
    unit: z.string().nullable().optional().describe('Unit of measurement (e.g. %, $, sqft)'),
    change: z.number().nullable().optional().describe('Percentage change from previous period'),
    changeType: z.enum(['increase', 'decrease']).nullable().optional().describe('Direction of change')
});
