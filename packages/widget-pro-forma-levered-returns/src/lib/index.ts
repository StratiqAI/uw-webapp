import { defineWidget } from '@stratiqai/dashboard-widget-sdk';
import {
	proFormaLeveredReturnsConfigSchema,
	proFormaLeveredReturnsInputSchema,
	proFormaLeveredReturnsAiOutputSchema
} from './schema.js';
import ProFormaLeveredReturnsWidget from './ProFormaLeveredReturnsWidget.svelte';

export const proFormaLeveredReturnsWidget = defineWidget({
	kind: 'proFormaLeveredReturns',
	displayName: 'Pro Forma Levered Returns',
	zodSchema: proFormaLeveredReturnsConfigSchema,
	inputSchema: proFormaLeveredReturnsInputSchema,
	component: ProFormaLeveredReturnsWidget,
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
		propertyName: '',
		loanLtv: 0.65,
		loanInterestRate: 0.065,
		amortizationYears: 30,
		interestOnly: false,
		leveredDiscountRate: 0.12
	},
	defaultSize: { colSpan: 12, rowSpan: 2 },
	promptConfig: {
		defaultPrompt: 'Generate levered return assumptions for this property investment',
		systemInstruction:
			'You are a commercial real estate underwriter. Return levered return assumptions including purchase price, income, expenses, loan terms, terminal cap rate, and discount rate.',
		model: 'GEMINI_2_5_FLASH',
		aiOutputSchema: proFormaLeveredReturnsAiOutputSchema,
		mapAiOutput: (out) => ({
			purchasePrice: out.purchasePrice as number,
			acquisitionCosts: 180_000,
			initialCapEx: 0,
			egiYear1: out.egiYear1 as number,
			egiGrowthRate: out.egiGrowthRate as number,
			totalOpexYear1: out.totalOpexYear1 as number,
			opexGrowthRate: out.opexGrowthRate as number,
			terminalCapRate: out.terminalCapRate as number,
			costOfSalePercent: 0.03,
			projectionYears: out.projectionYears as number,
			loanLtv: out.loanLtv as number,
			loanInterestRate: out.loanInterestRate as number,
			amortizationYears: out.amortizationYears as number,
			interestOnly: false,
			leveredDiscountRate: out.leveredDiscountRate as number
		})
	}
});

export type { ProFormaLeveredReturnsConfig, ProFormaLeveredReturnsInput, ProFormaLeveredReturnsAiOutput } from './schema.js';
export {
	proFormaLeveredReturnsConfigSchema,
	proFormaLeveredReturnsInputSchema,
	proFormaLeveredReturnsAiOutputSchema
} from './schema.js';
