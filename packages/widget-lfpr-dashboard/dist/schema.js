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
export const lfprDashboardAiOutputSchema = z.object({
    adultPopulation: z.number().describe('Working-age adult population'),
    adultPopYoy: z.number().describe('Adult population year-over-year change %'),
    laborForce: z.number().describe('Labor force count'),
    laborForceYoy: z.number().describe('Labor force year-over-year change %'),
    lfpr: z.number().describe('Labor force participation rate (0-100)'),
    lfprDirection: z.enum(['up', 'down', 'flat']).describe('LFPR trend direction'),
    trendData: z.array(z.object({
        year: z.string().describe('Year label'),
        rate: z.number().describe('LFPR for the year')
    })).describe('Historical LFPR trend data'),
    growthDrivers: z.array(z.object({
        label: z.string(),
        impact: z.enum(['high', 'moderate', 'low']),
        description: z.string()
    })).describe('Factors driving LFPR growth'),
    dragDrivers: z.array(z.object({
        label: z.string(),
        impact: z.enum(['high', 'moderate', 'low']),
        description: z.string()
    })).describe('Factors dragging LFPR down')
});
