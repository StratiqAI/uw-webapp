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
    entityDefinition: {
        name: 'Pro Forma Unlevered CF Output',
        description: 'Structured output for pro forma unlevered CF widgets',
        outputSchema: proFormaUnleveredCfAiOutputSchema
    },
    promptConfig: {
        defaultPrompt: 'Generate unlevered cash flow assumptions for this property',
        systemInstruction: 'You are a commercial real estate underwriter. Return unlevered cash flow assumptions including purchase price, EGI, OpEx, growth rates, and terminal cap rate.',
        model: 'GEMINI_2_5_FLASH',
        aiOutputSchema: proFormaUnleveredCfAiOutputSchema,
        mapAiOutput: (out) => ({
            purchasePrice: out.purchasePrice,
            acquisitionCosts: out.acquisitionCosts,
            initialCapEx: 0,
            egiYear1: out.egiYear1,
            egiGrowthRate: out.egiGrowthRate,
            totalOpexYear1: out.totalOpexYear1,
            opexGrowthRate: out.opexGrowthRate,
            terminalCapRate: out.terminalCapRate,
            costOfSalePercent: 0.03,
            projectionYears: out.projectionYears
        })
    }
});
export { proFormaUnleveredCfConfigSchema, proFormaUnleveredCfInputSchema, proFormaUnleveredCfAiOutputSchema } from './schema.js';
export { computeUnleveredProjections, extractUnleveredCashFlows } from './calculations.js';
