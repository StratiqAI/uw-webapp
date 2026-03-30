import { defineWidget } from '@stratiqai/dashboard-widget-sdk';
import { proFormaOpExConfigSchema, proFormaOpExInputSchema } from './schema.js';
import ProFormaOpExWidget from './ProFormaOpExWidget.svelte';

export const proFormaOpExWidget = defineWidget({
	kind: 'proFormaOpEx',
	displayName: 'Pro Forma OpEx',
	zodSchema: proFormaOpExConfigSchema,
	inputSchema: proFormaOpExInputSchema,
	component: ProFormaOpExWidget,
	defaultData: {
		unitType: 'units' as const,
		totalUnits: 100,
		totalSqFt: 0,
		egiYear1: 1734000,
		egiGrowthRate: 0.03,
		baseOperatingExpenses: 480000,
		expenseGrowthRate: 0.03,
		managementFeeRate: 0.04,
		reservePerUnit: 250,
		applyGrowthToReserves: false,
		customExpenses: [],
		projectionYears: 5,
		propertyName: ''
	},
	defaultSize: { colSpan: 12, rowSpan: 3 }
});

export type { ProFormaOpExConfig, ProFormaOpExInput, CustomExpenseRow, UnitType } from './schema.js';
export { proFormaOpExConfigSchema, proFormaOpExInputSchema } from './schema.js';
export { computeOpExProjections, type OpExYearProjection } from './calculations.js';
