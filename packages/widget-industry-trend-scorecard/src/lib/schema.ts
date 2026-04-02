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
