import { z } from 'zod';
import { proFormaUnleveredCfConfigSchema } from '@stratiqai/widget-pro-forma-unlevered-cf';
export const proFormaLeveredCfInputSchema = z.object({
    egiYear1: z.number().nonnegative().optional(),
    totalOpexYear1: z.number().nonnegative().optional(),
    purchasePrice: z.number().nonnegative().optional()
});
export const proFormaLeveredCfConfigSchema = proFormaUnleveredCfConfigSchema.extend({
    /** Loan as % of total acquisition (purchase + acq costs + initial CapEx). */
    loanLtv: z.number().min(0).max(1).default(0.65),
    /** Annual nominal interest rate (e.g. 0.065 = 6.5%). */
    loanInterestRate: z.number().min(0).max(1).default(0.065),
    amortizationYears: z.number().int().min(1).max(40).default(30),
    interestOnly: z.boolean().default(false)
});
export const proFormaLeveredCfAiOutputSchema = z.object({
    purchasePrice: z.number().describe('Property purchase price'),
    egiYear1: z.number().describe('Year 1 effective gross income'),
    egiGrowthRate: z.number().describe('Annual EGI growth rate'),
    totalOpexYear1: z.number().describe('Year 1 total operating expenses'),
    opexGrowthRate: z.number().describe('Annual OpEx growth rate'),
    terminalCapRate: z.number().describe('Terminal (exit) cap rate'),
    loanLtv: z.number().describe('Loan-to-value ratio (e.g. 0.65)'),
    loanInterestRate: z.number().describe('Annual loan interest rate (e.g. 0.065)'),
    amortizationYears: z.number().describe('Loan amortization period in years'),
    projectionYears: z.number().describe('Number of projection years')
});
