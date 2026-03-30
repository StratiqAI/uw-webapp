import { computeUnleveredProjections } from '@stratiqai/widget-pro-forma-unlevered-cf';
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

function monthlyPayment(principal: number, annualRate: number, amortYears: number): number {
	const n = amortYears * 12;
	if (n <= 0 || principal <= 0) return 0;
	const r = annualRate / 12;
	if (r === 0) return principal / n;
	return (principal * (r * Math.pow(1 + r, n))) / (Math.pow(1 + r, n) - 1);
}

/** Remaining principal after `paymentsMade` monthly payments. */
function remainingBalance(
	principal: number,
	annualRate: number,
	amortYears: number,
	paymentsMade: number
): number {
	const n = amortYears * 12;
	const p = Math.min(Math.max(0, paymentsMade), n);
	if (principal <= 0) return 0;
	const r = annualRate / 12;
	if (r === 0) return principal - (principal / n) * p;
	return (principal * (Math.pow(1 + r, n) - Math.pow(1 + r, p))) / (Math.pow(1 + r, n) - 1);
}

export function computeLeveredProjections(config: ProFormaLeveredCfConfig): {
	columns: LeveredYearColumn[];
	unleveredNetSaleYearN: number;
	loanAmount: number;
	remainingLoanAtSale: number;
	exitCapValid: boolean;
} {
	const unlevered = computeUnleveredProjections(config);
	const N = config.projectionYears;
	const totalAcquisition =
		config.purchasePrice + config.acquisitionCosts + config.initialCapEx;

	const loanAmount = Math.min(totalAcquisition * config.loanLtv, totalAcquisition);
	const equityInvestment = totalAcquisition - loanAmount;

	const monthlyPmt = config.interestOnly
		? loanAmount * (config.loanInterestRate / 12)
		: monthlyPayment(loanAmount, config.loanInterestRate, config.amortizationYears);
	const annualDebtService = monthlyPmt * 12;

	let remainingLoanAtSale = loanAmount;
	if (!config.interestOnly && loanAmount > 0) {
		remainingLoanAtSale = remainingBalance(
			loanAmount,
			config.loanInterestRate,
			config.amortizationYears,
			N * 12
		);
	}

	const lastCol = unlevered.columns[N];
	const unleveredNetSaleYearN = lastCol?.netSaleProceeds ?? 0;
	const exitCapValid = unlevered.exitCapValid;

	const netSaleAfterPayoff =
		exitCapValid && unleveredNetSaleYearN > 0
			? unleveredNetSaleYearN - remainingLoanAtSale
			: 0;

	const columns: LeveredYearColumn[] = [];

	for (let year = 0; year <= N; year++) {
		const u = unlevered.columns[year];
		const noi = u?.netOperatingIncome ?? 0;
		const ds = year >= 1 && year <= N && loanAmount > 0 ? annualDebtService : 0;
		const btOps = year >= 1 ? noi - ds : 0;
		const saleAfter =
			year === N && exitCapValid ? netSaleAfterPayoff : 0;

		let leveredCf: number;
		if (year === 0) {
			leveredCf = -equityInvestment;
		} else if (year === N) {
			leveredCf = btOps + saleAfter;
		} else {
			leveredCf = btOps;
		}

		columns.push({
			year,
			equityInvestment: year === 0 ? equityInvestment : 0,
			netOperatingIncome: noi,
			debtService: ds,
			beforeTaxCashFlowOps: btOps,
			netSaleProceedsAfterPayoff: saleAfter,
			leveredBeforeTaxCf: leveredCf
		});
	}

	return {
		columns,
		unleveredNetSaleYearN,
		loanAmount,
		remainingLoanAtSale,
		exitCapValid
	};
}

export function extractLeveredCashFlows(result: ReturnType<typeof computeLeveredProjections>): number[] {
	return result.columns.map((c) => c.leveredBeforeTaxCf);
}
