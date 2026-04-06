import { z } from 'zod';
export declare const proFormaLeveredReturnsInputSchema: z.ZodObject<{
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
export type ProFormaLeveredReturnsInput = z.infer<typeof proFormaLeveredReturnsInputSchema>;
export declare const proFormaLeveredReturnsConfigSchema: z.ZodObject<{
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
    loanLtv: z.ZodDefault<z.ZodNumber>;
    loanInterestRate: z.ZodDefault<z.ZodNumber>;
    amortizationYears: z.ZodDefault<z.ZodNumber>;
    interestOnly: z.ZodDefault<z.ZodBoolean>;
} & {
    /** Hurdle rate for levered NPV (often higher than unlevered). */
    leveredDiscountRate: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    leveredDiscountRate: number;
    projectionYears: number;
    purchasePrice: number;
    acquisitionCosts: number;
    initialCapEx: number;
    egiYear1: number;
    egiGrowthRate: number;
    totalOpexYear1: number;
    opexGrowthRate: number;
    terminalCapRate: number;
    costOfSalePercent: number;
    loanLtv: number;
    loanInterestRate: number;
    amortizationYears: number;
    interestOnly: boolean;
    propertyName?: string | undefined;
}, {
    leveredDiscountRate?: number | undefined;
    propertyName?: string | undefined;
    projectionYears?: number | undefined;
    purchasePrice?: number | undefined;
    acquisitionCosts?: number | undefined;
    initialCapEx?: number | undefined;
    egiYear1?: number | undefined;
    egiGrowthRate?: number | undefined;
    totalOpexYear1?: number | undefined;
    opexGrowthRate?: number | undefined;
    terminalCapRate?: number | undefined;
    costOfSalePercent?: number | undefined;
    loanLtv?: number | undefined;
    loanInterestRate?: number | undefined;
    amortizationYears?: number | undefined;
    interestOnly?: boolean | undefined;
}>;
export type ProFormaLeveredReturnsConfig = z.infer<typeof proFormaLeveredReturnsConfigSchema>;
export declare const proFormaLeveredReturnsAiOutputSchema: z.ZodObject<{
    purchasePrice: z.ZodNumber;
    egiYear1: z.ZodNumber;
    egiGrowthRate: z.ZodNumber;
    totalOpexYear1: z.ZodNumber;
    opexGrowthRate: z.ZodNumber;
    terminalCapRate: z.ZodNumber;
    loanLtv: z.ZodNumber;
    loanInterestRate: z.ZodNumber;
    amortizationYears: z.ZodNumber;
    leveredDiscountRate: z.ZodNumber;
    projectionYears: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    leveredDiscountRate: number;
    projectionYears: number;
    purchasePrice: number;
    egiYear1: number;
    egiGrowthRate: number;
    totalOpexYear1: number;
    opexGrowthRate: number;
    terminalCapRate: number;
    loanLtv: number;
    loanInterestRate: number;
    amortizationYears: number;
}, {
    leveredDiscountRate: number;
    projectionYears: number;
    purchasePrice: number;
    egiYear1: number;
    egiGrowthRate: number;
    totalOpexYear1: number;
    opexGrowthRate: number;
    terminalCapRate: number;
    loanLtv: number;
    loanInterestRate: number;
    amortizationYears: number;
}>;
export type ProFormaLeveredReturnsAiOutput = z.infer<typeof proFormaLeveredReturnsAiOutputSchema>;
