import { defineWidget } from '@stratiqai/dashboard-widget-sdk';
import { proFormaOpExConfigSchema, proFormaOpExInputSchema, proFormaOpExAiOutputSchema } from './schema.js';
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
	defaultSize: { colSpan: 12, rowSpan: 3 },
	entityDefinition: {
		name: 'Pro Forma OpEx Output',
		description: 'Structured output for pro forma OpEx widgets',
		outputSchema: proFormaOpExAiOutputSchema
	},
	promptConfig: {
		defaultPrompt: 'Generate operating expense assumptions for this property',
		systemInstruction:
			'You are a commercial real estate underwriter. Return OpEx pro forma assumptions including base expenses, growth rate, management fee, and reserves.',
		model: 'GEMINI_2_5_FLASH',
		aiOutputSchema: proFormaOpExAiOutputSchema,
		mapAiOutput: (out) => ({
			baseOperatingExpenses: out.baseOperatingExpenses as number,
			expenseGrowthRate: out.expenseGrowthRate as number,
			managementFeeRate: out.managementFeeRate as number,
			reservePerUnit: out.reservePerUnit as number,
			projectionYears: out.projectionYears as number
		})
	}
});

export type { ProFormaOpExConfig, ProFormaOpExInput, ProFormaOpExAiOutput, CustomExpenseRow, UnitType } from './schema.js';
export { proFormaOpExConfigSchema, proFormaOpExInputSchema, proFormaOpExAiOutputSchema } from './schema.js';
export { computeOpExProjections, type OpExYearProjection } from './calculations.js';
