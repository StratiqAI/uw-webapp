import type { ProFormaRevenueConfig } from './schema.js';
export interface YearProjection {
    year: number;
    grossPotentialRent: number;
    vacancyLoss: number;
    effectiveRentalIncome: number;
    otherIncome: number;
    effectiveGrossIncome: number;
}
/**
 * Compute multi-year revenue projections from widget configuration inputs.
 * Year 0 is acquisition (all zeroes); Years 1-N use compounding growth.
 */
export declare function computeRevenueProjections(config: ProFormaRevenueConfig): YearProjection[];
