import type { ProFormaUnleveredCfConfig } from './schema.js';
export interface UnleveredYearColumn {
    year: number;
    /** Positive magnitude (cash out); cash-flow row uses negative. */
    acquisitionCost: number;
    netOperatingIncome: number;
    netSaleProceeds: number;
    unleveredBeforeTaxCf: number;
}
export declare function computeUnleveredProjections(config: ProFormaUnleveredCfConfig): {
    columns: UnleveredYearColumn[];
    grossSalePrice: number | null;
    year6Noi: number;
    exitCapValid: boolean;
};
/** Annual unlevered before-tax cash flows indexed by calendar year column (Year 0 … Year N). */
export declare function extractUnleveredCashFlows(result: ReturnType<typeof computeUnleveredProjections>): number[];
