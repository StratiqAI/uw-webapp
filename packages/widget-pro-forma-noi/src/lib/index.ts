import { defineWidget } from '@stratiqai/dashboard-widget-sdk';
import { proFormaNoiConfigSchema, proFormaNoiInputSchema, proFormaNoiAiOutputSchema } from './schema.js';
import ProFormaNoiWidget from './ProFormaNoiWidget.svelte';

export const proFormaNoiWidget = defineWidget({
	kind: 'proFormaNoi',
	displayName: 'Pro Forma NOI',
	zodSchema: proFormaNoiConfigSchema,
	inputSchema: proFormaNoiInputSchema,
	component: ProFormaNoiWidget,
	defaultData: {
		egiYear1: 1734000,
		egiGrowthRate: 0.03,
		totalOpexYear1: 920000,
		opexGrowthRate: 0.03,
		projectionYears: 5,
		propertyName: '',
		showBreakdown: false
	},
	defaultSize: { colSpan: 12, rowSpan: 2 },
	entityDefinition: {
		name: 'Pro Forma NOI Output',
		description: 'Structured output for pro forma NOI widgets',
		outputSchema: proFormaNoiAiOutputSchema
	},
	promptConfig: {
		defaultPrompt: 'Generate NOI assumptions for this property',
		systemInstruction:
			'You are a commercial real estate underwriter. Return net operating income assumptions including EGI, OpEx, and growth rates.',
		model: 'GEMINI_2_5_FLASH',
		aiOutputSchema: proFormaNoiAiOutputSchema,
		mapAiOutput: (out) => ({
			egiYear1: out.egiYear1 as number,
			egiGrowthRate: out.egiGrowthRate as number,
			totalOpexYear1: out.totalOpexYear1 as number,
			opexGrowthRate: out.opexGrowthRate as number,
			projectionYears: out.projectionYears as number,
			showBreakdown: false
		})
	}
});

export type { ProFormaNoiConfig, ProFormaNoiInput, ProFormaNoiAiOutput } from './schema.js';
export { proFormaNoiConfigSchema, proFormaNoiInputSchema, proFormaNoiAiOutputSchema } from './schema.js';
export { computeNoiProjections, type NoiYearProjection } from './calculations.js';
