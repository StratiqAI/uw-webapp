import { defineWidget } from '@stratiqai/dashboard-widget-sdk';
import { gaugeWidgetDataSchema, gaugeAiOutputSchema } from './schema.js';
import GaugeWidget from './GaugeWidget.svelte';
export const gaugeWidget = defineWidget({
    kind: 'gauge',
    displayName: 'Gauge',
    zodSchema: gaugeWidgetDataSchema,
    component: GaugeWidget,
    defaultData: {
        value: 72,
        min: 0,
        max: 100,
        label: 'Score',
        unit: '%',
        color: '#22c55e'
    },
    defaultSize: { colSpan: 3, rowSpan: 2 },
    palette: { icon: '⏱', category: 'charts' },
    promptConfig: {
        defaultPrompt: 'Generate a gauge showing a key performance indicator',
        systemInstruction: 'You are a data analyst. Return a single gauge value with min/max range, label, and unit.',
        model: 'GEMINI_2_5_FLASH',
        aiOutputSchema: gaugeAiOutputSchema,
        mapAiOutput: (out) => ({
            value: out.value,
            min: out.min ?? 0,
            max: out.max ?? 100,
            label: out.label ?? null,
            unit: out.unit ?? null
        })
    }
});
export { gaugeWidgetDataSchema, gaugeAiOutputSchema } from './schema.js';
export { default as GaugeWidget } from './GaugeWidget.svelte';
