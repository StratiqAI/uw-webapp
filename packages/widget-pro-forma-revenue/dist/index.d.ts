export declare const proFormaRevenueWidget: import("@stratiqai/dashboard-widget-sdk").WidgetManifest<{
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
}>;
export type { ProFormaRevenueConfig, ProFormaRevenueInput, ProFormaRevenueAiOutput, UnitType } from './schema.js';
export { proFormaRevenueConfigSchema, proFormaRevenueInputSchema, proFormaRevenueAiOutputSchema } from './schema.js';
export { computeRevenueProjections, type YearProjection } from './calculations.js';
