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
export function computeRevenueProjections(config: ProFormaRevenueConfig): YearProjection[] {
	const {
		unitType,
		totalUnits,
		totalSqFt,
		marketRentPerUnit,
		rentGrowthRate,
		vacancyRate,
		otherIncomeAnnual,
		otherIncomeGrowthRate,
		projectionYears
	} = config;

	const quantity = unitType === 'sqft' ? totalSqFt : totalUnits;
	const baseGPR = quantity * marketRentPerUnit * 12;

	const projections: YearProjection[] = [];

	// Year 0: acquisition moment — no operating revenue
	projections.push({
		year: 0,
		grossPotentialRent: 0,
		vacancyLoss: 0,
		effectiveRentalIncome: 0,
		otherIncome: 0,
		effectiveGrossIncome: 0
	});

	for (let y = 1; y <= projectionYears; y++) {
		const gpr = baseGPR * Math.pow(1 + rentGrowthRate, y - 1);
		const vacancy = gpr * vacancyRate;
		const eri = gpr - vacancy;
		const other = otherIncomeAnnual * Math.pow(1 + otherIncomeGrowthRate, y - 1);
		const egi = eri + other;

		projections.push({
			year: y,
			grossPotentialRent: gpr,
			vacancyLoss: vacancy,
			effectiveRentalIncome: eri,
			otherIncome: other,
			effectiveGrossIncome: egi
		});
	}

	return projections;
}
