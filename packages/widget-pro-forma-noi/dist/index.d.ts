export declare const proFormaNoiWidget: import("@stratiqai/dashboard-widget-sdk").WidgetManifest<{
    egiYear1: number;
    totalOpexYear1: number;
    egiGrowthRate: number;
    opexGrowthRate: number;
    projectionYears: number;
    showBreakdown: boolean;
    propertyName?: string | undefined;
}>;
export type { ProFormaNoiConfig, ProFormaNoiInput } from './schema.js';
export { proFormaNoiConfigSchema, proFormaNoiInputSchema } from './schema.js';
export { computeNoiProjections, type NoiYearProjection } from './calculations.js';
