/**
 * Format a number as a currency string (no decimals) or '-' if zero.
 */
export function fmt(value) {
    if (value === 0)
        return '-';
    return value.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    });
}
/**
 * Format a number as a currency string with parentheses for display
 * in "Less:" rows, or '-' if zero.
 */
export function fmtDeduction(value) {
    if (value === 0)
        return '-';
    return `(${fmt(value)})`;
}
/**
 * Format a decimal rate as a percentage string (e.g. 0.03 -> "3.0%").
 */
export function pct(value) {
    return (value * 100).toFixed(1) + '%';
}
