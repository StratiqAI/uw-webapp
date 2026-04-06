import { defineWidget } from '@stratiqai/dashboard-widget-sdk';
import { proFormaRevenueConfigSchema, proFormaRevenueInputSchema, proFormaRevenueAiOutputSchema } from './schema.js';
import ProFormaRevenueWidget from './ProFormaRevenueWidget.svelte';
export const proFormaRevenueWidget = defineWidget({
    kind: 'proFormaRevenue',
    displayName: 'Pro Forma Revenue',
    zodSchema: proFormaRevenueConfigSchema,
    inputSchema: proFormaRevenueInputSchema,
    component: ProFormaRevenueWidget,
    defaultData: {
        unitType: 'units',
        totalUnits: 100,
        totalSqFt: 0,
        marketRentPerUnit: 1500,
        rentGrowthRate: 0.03,
        vacancyRate: 0.05,
        otherIncomeAnnual: 24000,
        otherIncomeGrowthRate: 0.02,
        projectionYears: 5,
        propertyName: ''
    },
    defaultSize: { colSpan: 12, rowSpan: 3 },
    promptConfig: {
        defaultPrompt: 'Generate revenue assumptions for this property',
        systemInstruction: 'You are a commercial real estate underwriter. Return revenue pro forma assumptions including units, rent, growth rates, and vacancy.',
        model: 'GEMINI_2_5_FLASH',
        aiOutputSchema: proFormaRevenueAiOutputSchema,
        mapAiOutput: (out) => ({
            unitType: 'units',
            totalUnits: out.totalUnits,
            totalSqFt: 0,
            marketRentPerUnit: out.marketRentPerUnit,
            rentGrowthRate: out.rentGrowthRate,
            vacancyRate: out.vacancyRate,
            otherIncomeAnnual: out.otherIncomeAnnual,
            otherIncomeGrowthRate: 0.02,
            projectionYears: out.projectionYears
        })
    }
});
export { proFormaRevenueConfigSchema, proFormaRevenueInputSchema, proFormaRevenueAiOutputSchema } from './schema.js';
export { computeRevenueProjections } from './calculations.js';
