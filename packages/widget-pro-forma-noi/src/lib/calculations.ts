import type { ProFormaNoiConfig } from './schema.js';

export interface NoiYearProjection {
	year: number;
	effectiveGrossIncome: number;
	totalOperatingExpenses: number;
	netOperatingIncome: number;
}

export function computeNoiProjections(config: ProFormaNoiConfig): NoiYearProjection[] {
	const { egiYear1, egiGrowthRate, totalOpexYear1, opexGrowthRate, projectionYears } = config;
	const out: NoiYearProjection[] = [];

	out.push({
		year: 0,
		effectiveGrossIncome: 0,
		totalOperatingExpenses: 0,
		netOperatingIncome: 0
	});

	for (let y = 1; y <= projectionYears; y++) {
		const egi = egiYear1 * Math.pow(1 + egiGrowthRate, y - 1);
		const opex = totalOpexYear1 * Math.pow(1 + opexGrowthRate, y - 1);
		out.push({
			year: y,
			effectiveGrossIncome: egi,
			totalOperatingExpenses: opex,
			netOperatingIncome: egi - opex
		});
	}

	return out;
}
