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
