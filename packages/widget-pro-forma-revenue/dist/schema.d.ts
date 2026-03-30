import { z } from 'zod';
export type UnitType = 'units' | 'sqft';
/**
 * Topic store input schema (narrow) -- what external sources publish.
 * Enough to seed the widget with property fundamentals.
 */
export declare const proFormaRevenueInputSchema: z.ZodObject<{
    totalUnits: z.ZodOptional<z.ZodNumber>;
    totalSqFt: z.ZodOptional<z.ZodNumber>;
    marketRentPerUnit: z.ZodOptional<z.ZodNumber>;
    otherIncomeAnnual: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    totalUnits?: number | undefined;
    totalSqFt?: number | undefined;
    marketRentPerUnit?: number | undefined;
    otherIncomeAnnual?: number | undefined;
}, {
    totalUnits?: number | undefined;
    totalSqFt?: number | undefined;
    marketRentPerUnit?: number | undefined;
    otherIncomeAnnual?: number | undefined;
}>;
export type ProFormaRevenueInput = z.infer<typeof proFormaRevenueInputSchema>;
/**
 * Full widget config schema (broad) -- what widget.data holds.
 * Includes all property inputs plus growth rates, vacancy, and display settings.
 */
export declare const proFormaRevenueConfigSchema: z.ZodObject<{
    unitType: z.ZodDefault<z.ZodEnum<["units", "sqft"]>>;
    totalUnits: z.ZodDefault<z.ZodNumber>;
    totalSqFt: z.ZodDefault<z.ZodNumber>;
    marketRentPerUnit: z.ZodDefault<z.ZodNumber>;
    rentGrowthRate: z.ZodDefault<z.ZodNumber>;
    vacancyRate: z.ZodDefault<z.ZodNumber>;
    otherIncomeAnnual: z.ZodDefault<z.ZodNumber>;
    otherIncomeGrowthRate: z.ZodDefault<z.ZodNumber>;
    projectionYears: z.ZodDefault<z.ZodNumber>;
    propertyName: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    totalUnits: number;
    totalSqFt: number;
    marketRentPerUnit: number;
    otherIncomeAnnual: number;
    unitType: "units" | "sqft";
    rentGrowthRate: number;
    vacancyRate: number;
    otherIncomeGrowthRate: number;
    projectionYears: number;
    propertyName?: string | undefined;
}, {
    totalUnits?: number | undefined;
    totalSqFt?: number | undefined;
    marketRentPerUnit?: number | undefined;
    otherIncomeAnnual?: number | undefined;
    unitType?: "units" | "sqft" | undefined;
    rentGrowthRate?: number | undefined;
    vacancyRate?: number | undefined;
    otherIncomeGrowthRate?: number | undefined;
    projectionYears?: number | undefined;
    propertyName?: string | undefined;
}>;
export type ProFormaRevenueConfig = z.infer<typeof proFormaRevenueConfigSchema>;
