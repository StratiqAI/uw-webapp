import { z } from 'zod';
export type UnitType = 'units' | 'sqft';
declare const customExpenseRowSchema: z.ZodObject<{
    label: z.ZodString;
    baseAmount: z.ZodNumber;
    growthRate: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    label: string;
    baseAmount: number;
    growthRate: number;
}, {
    label: string;
    baseAmount: number;
    growthRate?: number | undefined;
}>;
export type CustomExpenseRow = z.infer<typeof customExpenseRowSchema>;
/**
 * Topic store input schema (narrow) — what external sources can publish.
 * Allows injecting EGI values and property size from the revenue widget.
 */
export declare const proFormaOpExInputSchema: z.ZodObject<{
    egiYear1: z.ZodOptional<z.ZodNumber>;
    totalUnits: z.ZodOptional<z.ZodNumber>;
    totalSqFt: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    egiYear1?: number | undefined;
    totalUnits?: number | undefined;
    totalSqFt?: number | undefined;
}, {
    egiYear1?: number | undefined;
    totalUnits?: number | undefined;
    totalSqFt?: number | undefined;
}>;
export type ProFormaOpExInput = z.infer<typeof proFormaOpExInputSchema>;
/**
 * Full widget config schema (broad) — what widget.data holds.
 */
export declare const proFormaOpExConfigSchema: z.ZodObject<{
    unitType: z.ZodDefault<z.ZodEnum<["units", "sqft"]>>;
    totalUnits: z.ZodDefault<z.ZodNumber>;
    totalSqFt: z.ZodDefault<z.ZodNumber>;
    egiYear1: z.ZodDefault<z.ZodNumber>;
    egiGrowthRate: z.ZodDefault<z.ZodNumber>;
    baseOperatingExpenses: z.ZodDefault<z.ZodNumber>;
    expenseGrowthRate: z.ZodDefault<z.ZodNumber>;
    managementFeeRate: z.ZodDefault<z.ZodNumber>;
    reservePerUnit: z.ZodDefault<z.ZodNumber>;
    applyGrowthToReserves: z.ZodDefault<z.ZodBoolean>;
    customExpenses: z.ZodDefault<z.ZodArray<z.ZodObject<{
        label: z.ZodString;
        baseAmount: z.ZodNumber;
        growthRate: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        label: string;
        baseAmount: number;
        growthRate: number;
    }, {
        label: string;
        baseAmount: number;
        growthRate?: number | undefined;
    }>, "many">>;
    projectionYears: z.ZodDefault<z.ZodNumber>;
    propertyName: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    egiYear1: number;
    totalUnits: number;
    totalSqFt: number;
    unitType: "units" | "sqft";
    egiGrowthRate: number;
    baseOperatingExpenses: number;
    expenseGrowthRate: number;
    managementFeeRate: number;
    reservePerUnit: number;
    applyGrowthToReserves: boolean;
    customExpenses: {
        label: string;
        baseAmount: number;
        growthRate: number;
    }[];
    projectionYears: number;
    propertyName?: string | undefined;
}, {
    egiYear1?: number | undefined;
    totalUnits?: number | undefined;
    totalSqFt?: number | undefined;
    unitType?: "units" | "sqft" | undefined;
    egiGrowthRate?: number | undefined;
    baseOperatingExpenses?: number | undefined;
    expenseGrowthRate?: number | undefined;
    managementFeeRate?: number | undefined;
    reservePerUnit?: number | undefined;
    applyGrowthToReserves?: boolean | undefined;
    customExpenses?: {
        label: string;
        baseAmount: number;
        growthRate?: number | undefined;
    }[] | undefined;
    projectionYears?: number | undefined;
    propertyName?: string | undefined;
}>;
export type ProFormaOpExConfig = z.infer<typeof proFormaOpExConfigSchema>;
export declare const proFormaOpExAiOutputSchema: z.ZodObject<{
    baseOperatingExpenses: z.ZodNumber;
    expenseGrowthRate: z.ZodNumber;
    managementFeeRate: z.ZodNumber;
    reservePerUnit: z.ZodNumber;
    projectionYears: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    baseOperatingExpenses: number;
    expenseGrowthRate: number;
    managementFeeRate: number;
    reservePerUnit: number;
    projectionYears: number;
}, {
    baseOperatingExpenses: number;
    expenseGrowthRate: number;
    managementFeeRate: number;
    reservePerUnit: number;
    projectionYears: number;
}>;
export type ProFormaOpExAiOutput = z.infer<typeof proFormaOpExAiOutputSchema>;
export {};
