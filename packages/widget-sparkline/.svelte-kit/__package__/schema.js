import { z } from 'zod';
export const sparklineWidgetDataSchema = z.object({
    values: z.array(z.number()),
    label: z.string().nullable().optional(),
    color: z.string().nullable().optional()
});
