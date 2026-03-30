import type { ProFormaNoiConfig } from './schema.js';
export interface NoiYearProjection {
    year: number;
    effectiveGrossIncome: number;
    totalOperatingExpenses: number;
    netOperatingIncome: number;
}
export declare function computeNoiProjections(config: ProFormaNoiConfig): NoiYearProjection[];
