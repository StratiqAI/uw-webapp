import { defineWidget } from '@stratiqai/dashboard-widget-sdk';
import { proFormaUnleveredCfConfigSchema, proFormaUnleveredCfInputSchema } from './schema.js';
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
    defaultSize: { colSpan: 12, rowSpan: 3 }
});
export { proFormaUnleveredCfConfigSchema, proFormaUnleveredCfInputSchema } from './schema.js';
export { computeUnleveredProjections, extractUnleveredCashFlows } from './calculations.js';
