import { z } from 'zod';
/**
 * Topic store input schema -- what external sources publish (narrow).
 * The ValidatedTopicStore validates against this shape.
 */
export declare const lqAnalysisInputSchema: z.ZodObject<{
    city: z.ZodString;
    state: z.ZodString;
    zip: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    city: string;
    state: string;
    zip?: string | undefined;
}, {
    city: string;
    state: string;
    zip?: string | undefined;
}>;
export type LqAnalysisInput = z.infer<typeof lqAnalysisInputSchema>;
/** Sort mode for the sector list (UI only; does not change the RPC). */
export type LqAnalysisSortOrder = 'lq_desc' | 'lq_asc' | 'name_asc';
/**
 * Full widget config schema -- what widget.data holds (broad).
 * Includes the topic store input fields plus RPC/display configuration.
 */
export declare const lqAnalysisConfigSchema: z.ZodObject<{
    city: z.ZodString;
    state: z.ZodString;
    zip: z.ZodOptional<z.ZodString>;
    /** Manual FIPS override -- when set, bypasses the city/state FIPS lookup. */
    areaFips: z.ZodOptional<z.ZodString>;
    year: z.ZodNumber;
    regionLabel: z.ZodString;
    sortOrder: z.ZodEnum<["lq_desc", "lq_asc", "name_asc"]>;
    exportBaseThreshold: z.ZodNumber;
    localBandLow: z.ZodOptional<z.ZodNumber>;
    localBandHigh: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    city: string;
    state: string;
    year: number;
    regionLabel: string;
    sortOrder: "lq_desc" | "lq_asc" | "name_asc";
    exportBaseThreshold: number;
    zip?: string | undefined;
    areaFips?: string | undefined;
    localBandLow?: number | undefined;
    localBandHigh?: number | undefined;
}, {
    city: string;
    state: string;
    year: number;
    regionLabel: string;
    sortOrder: "lq_desc" | "lq_asc" | "name_asc";
    exportBaseThreshold: number;
    zip?: string | undefined;
    areaFips?: string | undefined;
    localBandLow?: number | undefined;
    localBandHigh?: number | undefined;
}>;
export type LqAnalysisConfig = z.infer<typeof lqAnalysisConfigSchema>;
