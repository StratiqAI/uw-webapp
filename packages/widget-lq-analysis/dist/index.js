import { defineWidget, HostServices } from '@stratiqai/dashboard-widget-sdk';
import { lqAnalysisConfigSchema, lqAnalysisInputSchema, lqAnalysisAiOutputSchema } from './schema.js';
import LqAnalysisWidget from './LqAnalysisWidget.svelte';
export const lqAnalysisWidget = defineWidget({
    kind: 'lqAnalysis',
    displayName: 'LQ Analysis',
    zodSchema: lqAnalysisConfigSchema,
    inputSchema: lqAnalysisInputSchema,
    component: LqAnalysisWidget,
    defaultData: {
        city: 'Portland',
        state: 'OR',
        year: 2025,
        regionLabel: 'Portland-Vancouver-Hillsboro, OR-WA',
        sortOrder: 'lq_desc',
        exportBaseThreshold: 1.08,
        localBandLow: 0.92,
        localBandHigh: 1.08
    },
    defaultSize: { colSpan: 12, rowSpan: 4 },
    capabilities: [HostServices.SUPABASE],
    promptConfig: {
        defaultPrompt: 'Identify the best metro area and year for location quotient analysis',
        systemInstruction: 'You are an economic research assistant. Return city, state, region label, and year for running a location quotient analysis.',
        model: 'GEMINI_2_5_FLASH',
        aiOutputSchema: lqAnalysisAiOutputSchema,
        mapAiOutput: (out) => ({
            city: out.city,
            state: out.state,
            regionLabel: out.regionLabel,
            year: out.year,
            sortOrder: 'lq_desc',
            exportBaseThreshold: 1.08,
            localBandLow: 0.92,
            localBandHigh: 1.08
        })
    }
});
export { lqAnalysisConfigSchema, lqAnalysisInputSchema, lqAnalysisAiOutputSchema } from './schema.js';
