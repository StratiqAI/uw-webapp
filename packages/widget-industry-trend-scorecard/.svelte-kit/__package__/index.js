import { defineWidget } from '@stratiqai/dashboard-widget-sdk';
import { industryTrendScorecardConfigSchema, industryTrendScorecardAiOutputSchema } from './schema.js';
import IndustryTrendScorecardWidget from './IndustryTrendScorecardWidget.svelte';
import { DEMO_INDUSTRIES, DEMO_QUARTERS, DEMO_WEIGHTS } from './demoData.js';
export const industryTrendScorecardWidget = defineWidget({
    kind: 'industryTrendScorecard',
    displayName: 'Industry Trend Scorecard',
    zodSchema: industryTrendScorecardConfigSchema,
    component: IndustryTrendScorecardWidget,
    defaultData: {
        quarters: DEMO_QUARTERS,
        industries: DEMO_INDUSTRIES,
        weights: DEMO_WEIGHTS
    },
    defaultSize: { colSpan: 12, rowSpan: 6 },
    palette: { icon: '📈', category: 'financial' },
    promptConfig: {
        defaultPrompt: 'Generate an industry trend scorecard for the local market',
        systemInstruction: 'You are an economic research analyst. Return quarterly industry trend data including employment, location quotient, wage, and establishment year-over-year changes for key industries.',
        model: 'GEMINI_2_5_FLASH',
        aiOutputSchema: industryTrendScorecardAiOutputSchema,
        mapAiOutput: (out) => ({
            quarters: out.quarters,
            industries: out.industries,
            weights: out.weights
        })
    }
});
export { industryTrendScorecardConfigSchema, industryTrendScorecardAiOutputSchema, industryDataSchema, quarterMetricsSchema, scoreWeightsSchema } from './schema.js';
export { DEMO_INDUSTRIES, DEMO_QUARTERS, DEMO_WEIGHTS } from './demoData.js';
