import { z } from 'zod';
export const metricWidgetDataSchema = z.object({
    label: z.string(),
    value: z.union([z.string(), z.number()]),
    change: z.number().nullable().optional(),
    changeType: z.enum(['increase', 'decrease']).nullable().optional(),
    unit: z.string().nullable().optional()
});
