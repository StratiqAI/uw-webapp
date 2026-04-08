import { defineWidget } from '@stratiqai/dashboard-widget-sdk';
import { proFormaLeveredCfConfigSchema, proFormaLeveredCfInputSchema, proFormaLeveredCfAiOutputSchema } from './schema.js';
import ProFormaLeveredCfWidget from './ProFormaLeveredCfWidget.svelte';
export const proFormaLeveredCfWidget = defineWidget({
    kind: 'proFormaLeveredCf',
    displayName: 'Pro Forma Levered CF',
    zodSchema: proFormaLeveredCfConfigSchema,
    inputSchema: proFormaLeveredCfInputSchema,
    component: ProFormaLeveredCfWidget,
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
        interestOnly: false
    },
    defaultSize: { colSpan: 12, rowSpan: 3 },
    entityDefinition: {
        name: 'Pro Forma Levered CF Output',
        description: 'Structured output for pro forma levered CF widgets',
        outputSchema: proFormaLeveredCfAiOutputSchema
    },
    promptConfig: {
        defaultPrompt: 'Generate levered cash flow assumptions for this property',
        systemInstruction: 'You are a commercial real estate underwriter. Return levered cash flow assumptions including purchase price, income, expenses, loan terms, and exit assumptions.',
        model: 'GEMINI_2_5_FLASH',
        aiOutputSchema: proFormaLeveredCfAiOutputSchema,
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
            loanLtv: out.loanLtv,
            loanInterestRate: out.loanInterestRate,
            amortizationYears: out.amortizationYears,
            interestOnly: false
        })
    }
});
export { proFormaLeveredCfConfigSchema, proFormaLeveredCfInputSchema, proFormaLeveredCfAiOutputSchema } from './schema.js';
export { computeLeveredProjections, extractLeveredCashFlows } from './calculations.js';
