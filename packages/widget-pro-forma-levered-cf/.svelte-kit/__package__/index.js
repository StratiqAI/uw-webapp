import { defineWidget } from '@stratiqai/dashboard-widget-sdk';
import { proFormaLeveredCfConfigSchema, proFormaLeveredCfInputSchema } from './schema.js';
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
    defaultSize: { colSpan: 12, rowSpan: 3 }
});
export { proFormaLeveredCfConfigSchema, proFormaLeveredCfInputSchema } from './schema.js';
export { computeLeveredProjections, extractLeveredCashFlows } from './calculations.js';
