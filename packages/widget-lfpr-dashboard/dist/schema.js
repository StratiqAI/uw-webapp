import { z } from 'zod';
export const lfprTrendYearSchema = z.object({
    year: z.string(),
    rate: z.number()
});
export const lfprDriverSchema = z.object({
    label: z.string(),
    impact: z.enum(['high', 'moderate', 'low']),
    description: z.string()
});
export const lfprDashboardConfigSchema = z.object({
    title: z.string().optional(),
    adultPopulation: z.number(),
    adultPopYoy: z.number(),
    laborForce: z.number(),
    laborForceYoy: z.number(),
    lfpr: z.number(),
    lfprDirection: z.enum(['up', 'down', 'flat']),
    trendData: z.array(lfprTrendYearSchema),
    growthDrivers: z.array(lfprDriverSchema),
    dragDrivers: z.array(lfprDriverSchema)
});
