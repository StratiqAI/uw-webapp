/**
 * NPV with Excel-style convention: Year 0 undiscounted, Years 1+ discounted by (1+r)^t.
 */
export function npv(discountRate, cashFlows) {
    let sum = cashFlows[0] ?? 0;
    for (let t = 1; t < cashFlows.length; t++) {
        sum += cashFlows[t] / Math.pow(1 + discountRate, t);
    }
    return sum;
}
/**
 * IRR for evenly spaced annual cash flows (Newton–Raphson).
 * Returns null if no convergence or invalid stream.
 */
export function irr(cashFlows, guess = 0.1) {
    if (cashFlows.length < 2)
        return null;
    let r = guess;
    for (let iter = 0; iter < 100; iter++) {
        let f = 0;
        let df = 0;
        for (let t = 0; t < cashFlows.length; t++) {
            const cf = cashFlows[t];
            if (t === 0) {
                f += cf;
            }
            else {
                const disc = Math.pow(1 + r, t);
                f += cf / disc;
                df -= (t * cf) / (disc * (1 + r));
            }
        }
        if (Math.abs(f) < 1e-9)
            return r;
        if (Math.abs(df) < 1e-14)
            break;
        const nr = r - f / df;
        if (!Number.isFinite(nr) || nr <= -0.9999)
            return null;
        if (Math.abs(nr - r) < 1e-10)
            return nr;
        r = nr;
    }
    return null;
}
/**
 * Sum of positive CFs in periods 1..n-1 divided by |negative Year 0 outflow|.
 */
export function equityMultiple(cashFlows) {
    if (cashFlows.length < 2)
        return null;
    const y0 = cashFlows[0];
    const neg = y0 < 0 ? Math.abs(y0) : 0;
    if (neg < 1e-10)
        return null;
    let pos = 0;
    for (let t = 1; t < cashFlows.length; t++) {
        const c = cashFlows[t];
        if (c > 0)
            pos += c;
    }
    return pos / neg;
}
/**
 * Cash-on-cash: Year 1 operating cash / |Year 0 equity|.
 */
export function cashOnCash(year0Equity, year1Cash) {
    const den = Math.abs(year0Equity);
    if (den < 1e-10)
        return null;
    return year1Cash / den;
}
