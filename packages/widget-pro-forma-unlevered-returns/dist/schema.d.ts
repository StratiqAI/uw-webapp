import { z } from 'zod';
export declare const proFormaUnleveredReturnsInputSchema: z.ZodObject<{
    egiYear1: z.ZodOptional<z.ZodNumber>;
    purchasePrice: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    egiYear1?: number | undefined;
    purchasePrice?: number | undefined;
}, {
    egiYear1?: number | undefined;
    purchasePrice?: number | undefined;
}>;
export type ProFormaUnleveredReturnsInput = z.infer<typeof proFormaUnleveredReturnsInputSchema>;
export declare const proFormaUnleveredReturnsConfigSchema: z.ZodObject<{
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
    /** Hurdle rate for NPV (unlevered). */
    unleveredDiscountRate: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    egiYear1: number;
    purchasePrice: number;
    unleveredDiscountRate: number;
    projectionYears: number;
    acquisitionCosts: number;
    initialCapEx: number;
    egiGrowthRate: number;
    totalOpexYear1: number;
    opexGrowthRate: number;
    terminalCapRate: number;
    costOfSalePercent: number;
    propertyName?: string | undefined;
}, {
    egiYear1?: number | undefined;
    purchasePrice?: number | undefined;
    unleveredDiscountRate?: number | undefined;
    propertyName?: string | undefined;
    projectionYears?: number | undefined;
    acquisitionCosts?: number | undefined;
    initialCapEx?: number | undefined;
    egiGrowthRate?: number | undefined;
    totalOpexYear1?: number | undefined;
    opexGrowthRate?: number | undefined;
    terminalCapRate?: number | undefined;
    costOfSalePercent?: number | undefined;
}>;
export type ProFormaUnleveredReturnsConfig = z.infer<typeof proFormaUnleveredReturnsConfigSchema>;
