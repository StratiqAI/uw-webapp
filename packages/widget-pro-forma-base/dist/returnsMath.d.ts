/**
 * NPV with Excel-style convention: Year 0 undiscounted, Years 1+ discounted by (1+r)^t.
 */
export declare function npv(discountRate: number, cashFlows: readonly number[]): number;
/**
 * IRR for evenly spaced annual cash flows (Newton–Raphson).
 * Returns null if no convergence or invalid stream.
 */
export declare function irr(cashFlows: readonly number[], guess?: number): number | null;
/**
 * Sum of positive CFs in periods 1..n-1 divided by |negative Year 0 outflow|.
 */
export declare function equityMultiple(cashFlows: readonly number[]): number | null;
/**
 * Cash-on-cash: Year 1 operating cash / |Year 0 equity|.
 */
export declare function cashOnCash(year0Equity: number, year1Cash: number): number | null;
