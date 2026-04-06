import { z } from 'zod';
import { proFormaLeveredCfConfigSchema, proFormaLeveredCfInputSchema } from '@stratiqai/widget-pro-forma-levered-cf';

export const proFormaLeveredReturnsInputSchema = proFormaLeveredCfInputSchema;

export type ProFormaLeveredReturnsInput = z.infer<typeof proFormaLeveredReturnsInputSchema>;

export const proFormaLeveredReturnsConfigSchema = proFormaLeveredCfConfigSchema.extend({
	/** Hurdle rate for levered NPV (often higher than unlevered). */
	leveredDiscountRate: z.number().min(0).max(1).default(0.12)
});

export type ProFormaLeveredReturnsConfig = z.infer<typeof proFormaLeveredReturnsConfigSchema>;

export const proFormaLeveredReturnsAiOutputSchema = z.object({
	purchasePrice: z.number().describe('Property purchase price'),
	egiYear1: z.number().describe('Year 1 effective gross income'),
	egiGrowthRate: z.number().describe('Annual EGI growth rate'),
	totalOpexYear1: z.number().describe('Year 1 total operating expenses'),
	opexGrowthRate: z.number().describe('Annual OpEx growth rate'),
	terminalCapRate: z.number().describe('Terminal (exit) cap rate'),
	loanLtv: z.number().describe('Loan-to-value ratio'),
	loanInterestRate: z.number().describe('Annual loan interest rate'),
	amortizationYears: z.number().describe('Loan amortization period in years'),
	leveredDiscountRate: z.number().describe('Hurdle rate for levered NPV'),
	projectionYears: z.number().describe('Number of projection years')
});

export type ProFormaLeveredReturnsAiOutput = z.infer<typeof proFormaLeveredReturnsAiOutputSchema>;
