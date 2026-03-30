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
export function computeOpExProjections(config: ProFormaOpExConfig): OpExYearProjection[] {
	const {
		unitType,
		totalUnits,
		totalSqFt,
		egiYear1,
		egiGrowthRate,
		baseOperatingExpenses,
		expenseGrowthRate,
		managementFeeRate,
		reservePerUnit,
		applyGrowthToReserves,
		customExpenses,
		projectionYears
	} = config;

	const quantity = unitType === 'sqft' ? totalSqFt : totalUnits;
	const projections: OpExYearProjection[] = [];

	projections.push({
		year: 0,
		operatingExpenses: 0,
		managementFee: 0,
		replacementReserves: 0,
		customExpenses: Object.fromEntries(customExpenses.map((r) => [r.label, 0])),
		totalOperatingExpenses: 0,
		egi: 0
	});

	for (let y = 1; y <= projectionYears; y++) {
		const egi = egiYear1 * Math.pow(1 + egiGrowthRate, y - 1);
		const opEx = baseOperatingExpenses * Math.pow(1 + expenseGrowthRate, y - 1);
		const mgmtFee = egi * managementFeeRate;
		const reserves = applyGrowthToReserves
			? quantity * reservePerUnit * Math.pow(1 + expenseGrowthRate, y - 1)
			: quantity * reservePerUnit;

		const customMap: Record<string, number> = {};
		let customTotal = 0;
		for (const row of customExpenses) {
			const val = row.baseAmount * Math.pow(1 + row.growthRate, y - 1);
			customMap[row.label] = val;
			customTotal += val;
		}

		projections.push({
			year: y,
			operatingExpenses: opEx,
			managementFee: mgmtFee,
			replacementReserves: reserves,
			customExpenses: customMap,
			totalOperatingExpenses: opEx + mgmtFee + reserves + customTotal,
			egi
		});
	}

	return projections;
}
