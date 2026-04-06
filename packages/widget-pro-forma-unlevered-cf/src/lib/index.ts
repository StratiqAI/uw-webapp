import { defineWidget } from '@stratiqai/dashboard-widget-sdk';
import { proFormaUnleveredCfConfigSchema, proFormaUnleveredCfInputSchema, proFormaUnleveredCfAiOutputSchema } from './schema.js';
import ProFormaUnleveredCfWidget from './ProFormaUnleveredCfWidget.svelte';

export const proFormaUnleveredCfWidget = defineWidget({
	kind: 'proFormaUnleveredCf',
	displayName: 'Pro Forma Unlevered CF',
	zodSchema: proFormaUnleveredCfConfigSchema,
	inputSchema: proFormaUnleveredCfInputSchema,
	component: ProFormaUnleveredCfWidget,
	defaultData: {
		projectionYears: 5,
		purchasePrice: 12_000_000,
		acquisitionCosts: 180_000,
		initialCapEx: 0,
		egiYear1: 1_734_000,
		egiGrowthRate: 0.03,
		totalOpexYear1: 920_000,
		opexGrowthRate: 0.03,
		terminalCapRate: 0.055,
		costOfSalePercent: 0.03,
		propertyName: ''
	},
	defaultSize: { colSpan: 12, rowSpan: 3 },
	promptConfig: {
		defaultPrompt: 'Generate unlevered cash flow assumptions for this property',
		systemInstruction:
			'You are a commercial real estate underwriter. Return unlevered cash flow assumptions including purchase price, EGI, OpEx, growth rates, and terminal cap rate.',
		model: 'GEMINI_2_5_FLASH',
		aiOutputSchema: proFormaUnleveredCfAiOutputSchema,
		mapAiOutput: (out) => ({
			purchasePrice: out.purchasePrice as number,
			acquisitionCosts: out.acquisitionCosts as number,
			initialCapEx: 0,
			egiYear1: out.egiYear1 as number,
			egiGrowthRate: out.egiGrowthRate as number,
			totalOpexYear1: out.totalOpexYear1 as number,
			opexGrowthRate: out.opexGrowthRate as number,
			terminalCapRate: out.terminalCapRate as number,
			costOfSalePercent: 0.03,
			projectionYears: out.projectionYears as number
		})
	}
});

export type { ProFormaUnleveredCfConfig, ProFormaUnleveredCfInput, ProFormaUnleveredCfAiOutput } from './schema.js';
export { proFormaUnleveredCfConfigSchema, proFormaUnleveredCfInputSchema, proFormaUnleveredCfAiOutputSchema } from './schema.js';
export {
	computeUnleveredProjections,
	extractUnleveredCashFlows,
	type UnleveredYearColumn
} from './calculations.js';
