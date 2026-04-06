import { z } from 'zod';

export const quarterMetricsSchema = z.object({
	empYoy: z.number(),
	lqValue: z.number(),
	wageYoy: z.number(),
	estabYoy: z.number()
});

export type QuarterMetrics = z.infer<typeof quarterMetricsSchema>;

export const lqTrendEnum = z.enum(['rising', 'stable', 'falling']);
export type LqTrend = z.infer<typeof lqTrendEnum>;

export const industryDataSchema = z.object({
	name: z.string().min(1),
	naicsCode: z.string().min(1),
	color: z.string().min(1),
	lqTrend: lqTrendEnum,
	data: z.array(quarterMetricsSchema).min(1)
});

export type IndustryData = z.infer<typeof industryDataSchema>;

export const scoreWeightsSchema = z.object({
	emp: z.number().min(0).max(100),
	lq: z.number().min(0).max(100),
	wage: z.number().min(0).max(100),
	estab: z.number().min(0).max(100)
});

export type ScoreWeights = z.infer<typeof scoreWeightsSchema>;

export const industryTrendScorecardConfigSchema = z.object({
	quarters: z.array(z.string()).min(1),
	industries: z.array(industryDataSchema).min(0),
	weights: scoreWeightsSchema
});

export type IndustryTrendScorecardConfig = z.infer<typeof industryTrendScorecardConfigSchema>;

export const industryTrendScorecardAiOutputSchema = z.object({
	quarters: z.array(z.string()).describe('Quarter labels e.g. ["2024-Q1", "2024-Q2"]'),
	industries: z.array(z.object({
		name: z.string().describe('Industry name'),
		naicsCode: z.string().describe('NAICS code'),
		color: z.string().describe('Hex color for the industry'),
		lqTrend: z.enum(['rising', 'stable', 'falling']).describe('Location quotient trend direction'),
		data: z.array(z.object({
			empYoy: z.number().describe('Employment year-over-year change %'),
			lqValue: z.number().describe('Location quotient value'),
			wageYoy: z.number().describe('Wage year-over-year change %'),
			estabYoy: z.number().describe('Establishment year-over-year change %')
		})).describe('Quarterly metrics')
	})).describe('Array of industries with trend data'),
	weights: z.object({
		emp: z.number().describe('Employment weight (0-100)'),
		lq: z.number().describe('LQ weight (0-100)'),
		wage: z.number().describe('Wage weight (0-100)'),
		estab: z.number().describe('Establishment weight (0-100)')
	}).describe('Score weights summing to 100')
});

export type IndustryTrendScorecardAiOutput = z.infer<typeof industryTrendScorecardAiOutputSchema>;
