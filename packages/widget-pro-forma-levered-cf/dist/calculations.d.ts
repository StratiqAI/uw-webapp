import type { ProFormaLeveredCfConfig } from './schema.js';
export interface LeveredYearColumn {
    year: number;
    equityInvestment: number;
    netOperatingIncome: number;
    debtService: number;
    beforeTaxCashFlowOps: number;
    netSaleProceedsAfterPayoff: number;
    leveredBeforeTaxCf: number;
}
export declare function computeLeveredProjections(config: ProFormaLeveredCfConfig): {
    columns: LeveredYearColumn[];
    unleveredNetSaleYearN: number;
    loanAmount: number;
    remainingLoanAtSale: number;
    exitCapValid: boolean;
};
export declare function extractLeveredCashFlows(result: ReturnType<typeof computeLeveredProjections>): number[];
