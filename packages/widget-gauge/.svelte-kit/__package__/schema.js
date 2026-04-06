import { z } from 'zod';
export const gaugeWidgetDataSchema = z.object({
    value: z.number(),
    min: z.number().nullable().optional(),
    max: z.number().nullable().optional(),
    label: z.string().nullable().optional(),
    unit: z.string().nullable().optional(),
    color: z.string().nullable().optional()
});
