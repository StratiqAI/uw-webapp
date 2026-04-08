import { defineWidget } from '@stratiqai/dashboard-widget-sdk';
import { lfprDashboardConfigSchema, lfprDashboardAiOutputSchema } from './schema.js';
import LfprDashboardWidget from './LfprDashboardWidget.svelte';
import { DEMO_LFPR_CONFIG } from './demoData.js';
export const lfprDashboardWidget = defineWidget({
    kind: 'lfprDashboard',
    displayName: 'LFPR Dashboard',
    zodSchema: lfprDashboardConfigSchema,
    component: LfprDashboardWidget,
    defaultData: DEMO_LFPR_CONFIG,
    defaultSize: { colSpan: 12, rowSpan: 5 },
    palette: { icon: '👥', category: 'financial' },
    entityDefinition: { name: 'LFPR Dashboard Output', description: 'Structured output for LFPR dashboard widgets', outputSchema: lfprDashboardAiOutputSchema },
    promptConfig: {
        defaultPrompt: 'Generate labor force participation rate data for the local market',
        systemInstruction: 'You are a labor market analyst. Return LFPR data including population stats, trend data, and growth/drag drivers.',
        model: 'GEMINI_2_5_FLASH',
        aiOutputSchema: lfprDashboardAiOutputSchema,
        mapAiOutput: (out) => out
    }
});
export { lfprDashboardConfigSchema, lfprDashboardAiOutputSchema, lfprTrendYearSchema, lfprDriverSchema } from './schema.js';
export { DEMO_LFPR_CONFIG } from './demoData.js';
