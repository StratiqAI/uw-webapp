export declare const lqAnalysisWidget: import("@stratiqai/dashboard-widget-sdk").WidgetManifest<{
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
export type { LqAnalysisConfig, LqAnalysisInput, LqAnalysisSortOrder } from './schema.js';
export { lqAnalysisConfigSchema, lqAnalysisInputSchema } from './schema.js';
export type { QcewSectorAggregate, LoadLocationQuotientParams } from './qcewSupabase.js';
