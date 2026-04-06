import { z } from 'zod';
export const locationQuotientWidgetDataSchema = z.object({
    areaFips: z.string().min(1),
    year: z.number().int().min(2025).max(2100),
    regionLabel: z.string().min(1),
    sortOrder: z.enum(['lq_desc', 'lq_asc', 'name_asc']),
    exportBaseThreshold: z.number().positive(),
    localBandLow: z.number().positive().optional(),
    localBandHigh: z.number().positive().optional()
});
