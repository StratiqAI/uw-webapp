import { z } from 'zod';
import { proFormaUnleveredCfConfigSchema } from '@stratiqai/widget-pro-forma-unlevered-cf';

export const proFormaUnleveredReturnsInputSchema = z.object({
	egiYear1: z.number().nonnegative().optional(),
	purchasePrice: z.number().nonnegative().optional()
});

export type ProFormaUnleveredReturnsInput = z.infer<typeof proFormaUnleveredReturnsInputSchema>;

export const proFormaUnleveredReturnsConfigSchema = proFormaUnleveredCfConfigSchema.extend({
	/** Hurdle rate for NPV (unlevered). */
	unleveredDiscountRate: z.number().min(0).max(1).default(0.1)
});

export type ProFormaUnleveredReturnsConfig = z.infer<typeof proFormaUnleveredReturnsConfigSchema>;

export const proFormaUnleveredReturnsAiOutputSchema = z.object({
	purchasePrice: z.number().describe('Property purchase price'),
	egiYear1: z.number().describe('Year 1 effective gross income'),
	egiGrowthRate: z.number().describe('Annual EGI growth rate'),
	totalOpexYear1: z.number().describe('Year 1 total operating expenses'),
	opexGrowthRate: z.number().describe('Annual OpEx growth rate'),
	terminalCapRate: z.number().describe('Terminal (exit) cap rate'),
	unleveredDiscountRate: z.number().describe('Hurdle rate for unlevered NPV'),
	projectionYears: z.number().describe('Number of projection years')
});

export type ProFormaUnleveredReturnsAiOutput = z.infer<typeof proFormaUnleveredReturnsAiOutputSchema>;
