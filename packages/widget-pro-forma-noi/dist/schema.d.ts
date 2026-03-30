import { z } from 'zod';
/**
 * Narrow topic input — external streams can push EGI / total OpEx anchors.
 */
export declare const proFormaNoiInputSchema: z.ZodObject<{
    egiYear1: z.ZodOptional<z.ZodNumber>;
    totalOpexYear1: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    egiYear1?: number | undefined;
    totalOpexYear1?: number | undefined;
}, {
    egiYear1?: number | undefined;
    totalOpexYear1?: number | undefined;
}>;
export type ProFormaNoiInput = z.infer<typeof proFormaNoiInputSchema>;
/**
 * Full persisted config. NOI = projected EGI − projected total operating expenses.
 */
export declare const proFormaNoiConfigSchema: z.ZodObject<{
    egiYear1: z.ZodDefault<z.ZodNumber>;
    egiGrowthRate: z.ZodDefault<z.ZodNumber>;
    totalOpexYear1: z.ZodDefault<z.ZodNumber>;
    opexGrowthRate: z.ZodDefault<z.ZodNumber>;
    projectionYears: z.ZodDefault<z.ZodNumber>;
    propertyName: z.ZodOptional<z.ZodString>;
    /** When true, front table shows EGI and Total OpEx rows above NOI. */
    showBreakdown: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    egiYear1: number;
    totalOpexYear1: number;
    egiGrowthRate: number;
    opexGrowthRate: number;
    projectionYears: number;
    showBreakdown: boolean;
    propertyName?: string | undefined;
}, {
    egiYear1?: number | undefined;
    totalOpexYear1?: number | undefined;
    egiGrowthRate?: number | undefined;
    opexGrowthRate?: number | undefined;
    projectionYears?: number | undefined;
    propertyName?: string | undefined;
    showBreakdown?: boolean | undefined;
}>;
export type ProFormaNoiConfig = z.infer<typeof proFormaNoiConfigSchema>;
