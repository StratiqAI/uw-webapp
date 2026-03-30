import { defineWidget } from '@stratiqai/dashboard-widget-sdk';
import { proFormaRevenueConfigSchema, proFormaRevenueInputSchema } from './schema.js';
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
	defaultSize: { colSpan: 12, rowSpan: 3 }
});

export type { ProFormaRevenueConfig, ProFormaRevenueInput, UnitType } from './schema.js';
export { proFormaRevenueConfigSchema, proFormaRevenueInputSchema } from './schema.js';
export { computeRevenueProjections, type YearProjection } from './calculations.js';
