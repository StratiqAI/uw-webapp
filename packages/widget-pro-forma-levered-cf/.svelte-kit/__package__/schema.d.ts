import { z } from 'zod';
export declare const proFormaLeveredCfInputSchema: z.ZodObject<{
    egiYear1: z.ZodOptional<z.ZodNumber>;
    totalOpexYear1: z.ZodOptional<z.ZodNumber>;
    purchasePrice: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    egiYear1?: number | undefined;
    totalOpexYear1?: number | undefined;
    purchasePrice?: number | undefined;
}, {
    egiYear1?: number | undefined;
    totalOpexYear1?: number | undefined;
    purchasePrice?: number | undefined;
}>;
export type ProFormaLeveredCfInput = z.infer<typeof proFormaLeveredCfInputSchema>;
export declare const proFormaLeveredCfConfigSchema: z.ZodObject<{
    propertyName: z.ZodOptional<z.ZodString>;
    projectionYears: z.ZodDefault<z.ZodNumber>;
    purchasePrice: z.ZodDefault<z.ZodNumber>;
    acquisitionCosts: z.ZodDefault<z.ZodNumber>;
    initialCapEx: z.ZodDefault<z.ZodNumber>;
    egiYear1: z.ZodDefault<z.ZodNumber>;
    egiGrowthRate: z.ZodDefault<z.ZodNumber>;
    totalOpexYear1: z.ZodDefault<z.ZodNumber>;
    opexGrowthRate: z.ZodDefault<z.ZodNumber>;
    terminalCapRate: z.ZodDefault<z.ZodNumber>;
    costOfSalePercent: z.ZodDefault<z.ZodNumber>;
} & {
    /** Loan as % of total acquisition (purchase + acq costs + initial CapEx). */
    loanLtv: z.ZodDefault<z.ZodNumber>;
    /** Annual nominal interest rate (e.g. 0.065 = 6.5%). */
    loanInterestRate: z.ZodDefault<z.ZodNumber>;
    amortizationYears: z.ZodDefault<z.ZodNumber>;
    interestOnly: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    egiYear1: number;
    totalOpexYear1: number;
    purchasePrice: number;
    loanLtv: number;
    loanInterestRate: number;
    amortizationYears: number;
    interestOnly: boolean;
    projectionYears: number;
    acquisitionCosts: number;
    initialCapEx: number;
    egiGrowthRate: number;
    opexGrowthRate: number;
    terminalCapRate: number;
    costOfSalePercent: number;
    propertyName?: string | undefined;
}, {
    egiYear1?: number | undefined;
    totalOpexYear1?: number | undefined;
    purchasePrice?: number | undefined;
    loanLtv?: number | undefined;
    loanInterestRate?: number | undefined;
    amortizationYears?: number | undefined;
    interestOnly?: boolean | undefined;
    propertyName?: string | undefined;
    projectionYears?: number | undefined;
    acquisitionCosts?: number | undefined;
    initialCapEx?: number | undefined;
    egiGrowthRate?: number | undefined;
    opexGrowthRate?: number | undefined;
    terminalCapRate?: number | undefined;
    costOfSalePercent?: number | undefined;
}>;
export type ProFormaLeveredCfConfig = z.infer<typeof proFormaLeveredCfConfigSchema>;
export declare const proFormaLeveredCfAiOutputSchema: z.ZodObject<{
    purchasePrice: z.ZodNumber;
    egiYear1: z.ZodNumber;
    egiGrowthRate: z.ZodNumber;
    totalOpexYear1: z.ZodNumber;
    opexGrowthRate: z.ZodNumber;
    terminalCapRate: z.ZodNumber;
    loanLtv: z.ZodNumber;
    loanInterestRate: z.ZodNumber;
    amortizationYears: z.ZodNumber;
    projectionYears: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    egiYear1: number;
    totalOpexYear1: number;
    purchasePrice: number;
    loanLtv: number;
    loanInterestRate: number;
    amortizationYears: number;
    projectionYears: number;
    egiGrowthRate: number;
    opexGrowthRate: number;
    terminalCapRate: number;
}, {
    egiYear1: number;
    totalOpexYear1: number;
    purchasePrice: number;
    loanLtv: number;
    loanInterestRate: number;
    amortizationYears: number;
    projectionYears: number;
    egiGrowthRate: number;
    opexGrowthRate: number;
    terminalCapRate: number;
}>;
export type ProFormaLeveredCfAiOutput = z.infer<typeof proFormaLeveredCfAiOutputSchema>;
