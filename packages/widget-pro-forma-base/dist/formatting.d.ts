/**
 * Format a number as a currency string (no decimals) or '-' if zero.
 */
export declare function fmt(value: number): string;
/**
 * Format a number as a currency string with parentheses for display
 * in "Less:" rows, or '-' if zero.
 */
export declare function fmtDeduction(value: number): string;
/**
 * Format a decimal rate as a percentage string (e.g. 0.03 -> "3.0%").
 */
export declare function pct(value: number): string;
