import { defineWidget } from '@stratiqai/dashboard-widget-sdk';
import { proFormaLeveredReturnsConfigSchema, proFormaLeveredReturnsInputSchema } from './schema.js';
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
    defaultSize: { colSpan: 12, rowSpan: 2 }
});
export { proFormaLeveredReturnsConfigSchema, proFormaLeveredReturnsInputSchema } from './schema.js';
