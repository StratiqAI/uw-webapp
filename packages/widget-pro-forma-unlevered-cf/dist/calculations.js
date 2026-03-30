function noiForOperatingYear(y, egiYear1, egiG, opexYear1, opexG) {
    if (y < 1)
        return 0;
    const egi = egiYear1 * Math.pow(1 + egiG, y - 1);
    const opex = opexYear1 * Math.pow(1 + opexG, y - 1);
    return egi - opex;
}
/**
 * Year (N+1) NOI for cap-rate exit, where N = last column year index (holding period end).
 */
function noiYearAfterHold(N, cfg) {
    const { egiYear1, egiGrowthRate, totalOpexYear1, opexGrowthRate } = cfg;
    return noiForOperatingYear(N + 1, egiYear1, egiGrowthRate, totalOpexYear1, opexGrowthRate);
}
export function computeUnleveredProjections(config) {
    const N = config.projectionYears;
    const acquisitionTotal = config.purchasePrice + config.acquisitionCosts + config.initialCapEx;
    const cap = config.terminalCapRate;
    const exitCapValid = cap > 0;
    const year6Noi = noiYearAfterHold(N, config);
    let grossSalePrice = null;
    let netSaleProceeds = 0;
    if (exitCapValid) {
        grossSalePrice = year6Noi / cap;
        netSaleProceeds = grossSalePrice * (1 - config.costOfSalePercent);
    }
    const columns = [];
    for (let year = 0; year <= N; year++) {
        const acq = year === 0 ? acquisitionTotal : 0;
        const noi = noiForOperatingYear(year, config.egiYear1, config.egiGrowthRate, config.totalOpexYear1, config.opexGrowthRate);
        const sale = year === N && exitCapValid ? netSaleProceeds : 0;
        let cf;
        if (year === 0) {
            cf = -acquisitionTotal;
        }
        else if (year === N) {
            cf = noi + sale;
        }
        else {
            cf = noi;
        }
        columns.push({
            year,
            acquisitionCost: acq,
            netOperatingIncome: noi,
            netSaleProceeds: sale,
            unleveredBeforeTaxCf: cf
        });
    }
    return { columns, grossSalePrice, year6Noi, exitCapValid };
}
/** Annual unlevered before-tax cash flows indexed by calendar year column (Year 0 … Year N). */
export function extractUnleveredCashFlows(result) {
    return result.columns.map((c) => c.unleveredBeforeTaxCf);
}
