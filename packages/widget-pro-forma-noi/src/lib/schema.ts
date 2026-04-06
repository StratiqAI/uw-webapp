import { z } from 'zod';

/**
 * Narrow topic input — external streams can push EGI / total OpEx anchors.
 */
export const proFormaNoiInputSchema = z.object({
	egiYear1: z.number().nonnegative().optional(),
	totalOpexYear1: z.number().nonnegative().optional()
});

export type ProFormaNoiInput = z.infer<typeof proFormaNoiInputSchema>;

/**
 * Full persisted config. NOI = projected EGI − projected total operating expenses.
 */
export const proFormaNoiConfigSchema = z.object({
	egiYear1: z.number().nonnegative().default(0),
	egiGrowthRate: z.number().min(0).max(1).default(0.03),
	totalOpexYear1: z.number().nonnegative().default(0),
	opexGrowthRate: z.number().min(0).max(1).default(0.03),
	projectionYears: z.number().int().min(1).max(10).default(5),
	propertyName: z.string().optional(),
	/** When true, front table shows EGI and Total OpEx rows above NOI. */
	showBreakdown: z.boolean().default(false)
});

export type ProFormaNoiConfig = z.infer<typeof proFormaNoiConfigSchema>;

export const proFormaNoiAiOutputSchema = z.object({
	egiYear1: z.number().describe('Year 1 effective gross income'),
	egiGrowthRate: z.number().describe('Annual EGI growth rate'),
	totalOpexYear1: z.number().describe('Year 1 total operating expenses'),
	opexGrowthRate: z.number().describe('Annual OpEx growth rate'),
	projectionYears: z.number().describe('Number of projection years')
});

export type ProFormaNoiAiOutput = z.infer<typeof proFormaNoiAiOutputSchema>;
