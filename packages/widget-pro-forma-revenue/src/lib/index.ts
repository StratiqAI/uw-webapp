import { defineWidget } from '@stratiqai/dashboard-widget-sdk';
import { proFormaRevenueConfigSchema, proFormaRevenueInputSchema, proFormaRevenueAiOutputSchema } from './schema.js';
import ProFormaRevenueWidget from './ProFormaRevenueWidget.svelte';

export const proFormaRevenueWidget = defineWidget({
	kind: 'proFormaRevenue',
	displayName: 'Pro Forma Revenue',
	zodSchema: proFormaRevenueConfigSchema,
	inputSchema: proFormaRevenueInputSchema,
	component: ProFormaRevenueWidget,
	defaultData: {
		unitType: 'units' as const,
		totalUnits: 100,
		totalSqFt: 0,
		marketRentPerUnit: 1500,
		rentGrowthRate: 0.03,
		vacancyRate: 0.05,
		otherIncomeAnnual: 24000,
		otherIncomeGrowthRate: 0.02,
		projectionYears: 5,
		propertyName: ''
	},
	defaultSize: { colSpan: 12, rowSpan: 3 },
	promptConfig: {
		defaultPrompt: 'Generate revenue assumptions for this property',
		systemInstruction:
			'You are a commercial real estate underwriter. Return revenue pro forma assumptions including units, rent, growth rates, and vacancy.',
		model: 'GEMINI_2_5_FLASH',
		aiOutputSchema: proFormaRevenueAiOutputSchema,
		mapAiOutput: (out) => ({
			unitType: 'units',
			totalUnits: out.totalUnits as number,
			totalSqFt: 0,
			marketRentPerUnit: out.marketRentPerUnit as number,
			rentGrowthRate: out.rentGrowthRate as number,
			vacancyRate: out.vacancyRate as number,
			otherIncomeAnnual: out.otherIncomeAnnual as number,
			otherIncomeGrowthRate: 0.02,
			projectionYears: out.projectionYears as number
		})
	}
});

export type { ProFormaRevenueConfig, ProFormaRevenueInput, ProFormaRevenueAiOutput, UnitType } from './schema.js';
export { proFormaRevenueConfigSchema, proFormaRevenueInputSchema, proFormaRevenueAiOutputSchema } from './schema.js';
export { computeRevenueProjections, type YearProjection } from './calculations.js';
