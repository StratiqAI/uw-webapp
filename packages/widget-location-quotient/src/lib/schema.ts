import { z } from 'zod';

export type LocationQuotientSortOrder = 'lq_desc' | 'lq_asc' | 'name_asc';

export const locationQuotientWidgetDataSchema = z.object({
	areaFips: z.string().min(1),
	year: z.number().int().min(2025).max(2100),
	regionLabel: z.string().min(1),
	sortOrder: z.enum(['lq_desc', 'lq_asc', 'name_asc']),
	exportBaseThreshold: z.number().positive(),
	localBandLow: z.number().positive().optional(),
	localBandHigh: z.number().positive().optional()
});

export type LocationQuotientWidgetData = z.infer<typeof locationQuotientWidgetDataSchema>;

export const locationQuotientAiOutputSchema = z.object({
	areaFips: z.string().describe('FIPS code for the area'),
	year: z.number().describe('Data year'),
	regionLabel: z.string().describe('Human-readable region name')
});

export type LocationQuotientAiOutput = z.infer<typeof locationQuotientAiOutputSchema>;

export interface QcewSectorAggregate {
	industry_code: string;
	industry_title: string;
	lq_avg: number;
	avg_monthly_emp: number;
}
