import { defineWidget } from '@stratiqai/dashboard-widget-sdk';
import { proFormaUnleveredReturnsConfigSchema, proFormaUnleveredReturnsInputSchema, proFormaUnleveredReturnsAiOutputSchema } from './schema.js';
import ProFormaUnleveredReturnsWidget from './ProFormaUnleveredReturnsWidget.svelte';
export const proFormaUnleveredReturnsWidget = defineWidget({
    kind: 'proFormaUnleveredReturns',
    displayName: 'Pro Forma Unlevered Returns',
    zodSchema: proFormaUnleveredReturnsConfigSchema,
    inputSchema: proFormaUnleveredReturnsInputSchema,
    component: ProFormaUnleveredReturnsWidget,
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
        unleveredDiscountRate: 0.1
    },
    defaultSize: { colSpan: 12, rowSpan: 2 },
    promptConfig: {
        defaultPrompt: 'Generate unlevered return assumptions for this property investment',
        systemInstruction: 'You are a commercial real estate underwriter. Return unlevered return assumptions including purchase price, income, expenses, terminal cap rate, and discount rate.',
        model: 'GEMINI_2_5_FLASH',
        aiOutputSchema: proFormaUnleveredReturnsAiOutputSchema,
        mapAiOutput: (out) => ({
            purchasePrice: out.purchasePrice,
            acquisitionCosts: 180_000,
            initialCapEx: 0,
            egiYear1: out.egiYear1,
            egiGrowthRate: out.egiGrowthRate,
            totalOpexYear1: out.totalOpexYear1,
            opexGrowthRate: out.opexGrowthRate,
            terminalCapRate: out.terminalCapRate,
            costOfSalePercent: 0.03,
            projectionYears: out.projectionYears,
            unleveredDiscountRate: out.unleveredDiscountRate
        })
    }
});
export { proFormaUnleveredReturnsConfigSchema, proFormaUnleveredReturnsInputSchema, proFormaUnleveredReturnsAiOutputSchema } from './schema.js';
