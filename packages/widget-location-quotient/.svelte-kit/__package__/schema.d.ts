import { z } from 'zod';
export type LocationQuotientSortOrder = 'lq_desc' | 'lq_asc' | 'name_asc';
export declare const locationQuotientWidgetDataSchema: z.ZodObject<{
    areaFips: z.ZodString;
    year: z.ZodNumber;
    regionLabel: z.ZodString;
    sortOrder: z.ZodEnum<["lq_desc", "lq_asc", "name_asc"]>;
    exportBaseThreshold: z.ZodNumber;
    localBandLow: z.ZodOptional<z.ZodNumber>;
    localBandHigh: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    areaFips: string;
    year: number;
    regionLabel: string;
    sortOrder: "lq_desc" | "lq_asc" | "name_asc";
    exportBaseThreshold: number;
    localBandLow?: number | undefined;
    localBandHigh?: number | undefined;
}, {
    areaFips: string;
    year: number;
    regionLabel: string;
    sortOrder: "lq_desc" | "lq_asc" | "name_asc";
    exportBaseThreshold: number;
    localBandLow?: number | undefined;
    localBandHigh?: number | undefined;
}>;
export type LocationQuotientWidgetData = z.infer<typeof locationQuotientWidgetDataSchema>;
export interface QcewSectorAggregate {
    industry_code: string;
    industry_title: string;
    lq_avg: number;
    avg_monthly_emp: number;
}
