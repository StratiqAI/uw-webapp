import type { ProFormaOpExConfig } from './schema.js';
export interface OpExYearProjection {
    year: number;
    operatingExpenses: number;
    managementFee: number;
    replacementReserves: number;
    customExpenses: Record<string, number>;
    totalOperatingExpenses: number;
    /** EGI used for management fee calculation (for display). */
    egi: number;
}
/**
 * Compute multi-year operating expense projections.
 * Year 0 is acquisition (all zeroes); Years 1-N use compounding growth.
 */
export declare function computeOpExProjections(config: ProFormaOpExConfig): OpExYearProjection[];
