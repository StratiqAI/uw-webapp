export declare const proFormaOpExWidget: import("@stratiqai/dashboard-widget-sdk").WidgetManifest<{
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
}>;
export type { ProFormaOpExConfig, ProFormaOpExInput, CustomExpenseRow, UnitType } from './schema.js';
export { proFormaOpExConfigSchema, proFormaOpExInputSchema } from './schema.js';
export { computeOpExProjections, type OpExYearProjection } from './calculations.js';
