import { defineWidget } from '@stratiqai/dashboard-widget-sdk';
import { econBaseMultiplierConfigSchema, econBaseMultiplierAiOutputSchema } from './schema.js';
import EconBaseMultiplierWidget from './EconBaseMultiplierWidget.svelte';
import { DEMO_INDUSTRIES } from './demoData.js';
export const econBaseMultiplierWidget = defineWidget({
    kind: 'econBaseMultiplier',
    displayName: 'Economic Base Multiplier',
    zodSchema: econBaseMultiplierConfigSchema,
    component: EconBaseMultiplierWidget,
    defaultData: {
        regionLabel: 'Sample Region',
        industries: DEMO_INDUSTRIES
    },
    defaultSize: { colSpan: 8, rowSpan: 4 },
    palette: { icon: '📊', category: 'financial' },
    promptConfig: {
        defaultPrompt: 'Generate economic base multiplier data for the local region',
        systemInstruction: 'You are an economic analyst. Return industry employment data with NAICS codes, local and national employment counts for computing location quotients and economic base multipliers.',
        model: 'GEMINI_2_5_FLASH',
        aiOutputSchema: econBaseMultiplierAiOutputSchema,
        mapAiOutput: (out) => ({
            regionLabel: out.regionLabel ?? 'AI Generated Region',
            industries: out.industries
        })
    }
});
export { econBaseMultiplierConfigSchema, econBaseIndustrySchema, econBaseMultiplierAiOutputSchema } from './schema.js';
export { DEMO_INDUSTRIES } from './demoData.js';
