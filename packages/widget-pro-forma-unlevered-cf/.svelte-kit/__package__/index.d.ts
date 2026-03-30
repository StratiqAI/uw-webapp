export declare const proFormaUnleveredCfWidget: import("@stratiqai/dashboard-widget-sdk").WidgetManifest<{
    egiYear1: number;
    totalOpexYear1: number;
    purchasePrice: number;
    projectionYears: number;
    acquisitionCosts: number;
    initialCapEx: number;
    egiGrowthRate: number;
    opexGrowthRate: number;
    terminalCapRate: number;
    costOfSalePercent: number;
    propertyName?: string | undefined;
}>;
export type { ProFormaUnleveredCfConfig, ProFormaUnleveredCfInput } from './schema.js';
export { proFormaUnleveredCfConfigSchema, proFormaUnleveredCfInputSchema } from './schema.js';
export { computeUnleveredProjections, extractUnleveredCashFlows, type UnleveredYearColumn } from './calculations.js';
