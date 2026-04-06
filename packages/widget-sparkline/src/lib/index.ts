import { defineWidget } from '@stratiqai/dashboard-widget-sdk';
import { sparklineWidgetDataSchema, sparklineAiOutputSchema } from './schema.js';
import SparklineWidget from './SparklineWidget.svelte';

export const sparklineWidget = defineWidget({
	kind: 'sparkline',
	displayName: 'Sparkline',
	zodSchema: sparklineWidgetDataSchema,
	component: SparklineWidget,
	defaultData: {
		values: [12, 19, 15, 25, 22, 30, 28, 35, 32, 40],
		label: 'Trend',
		color: '#3b82f6'
	},
	defaultSize: { colSpan: 4, rowSpan: 1 },
	palette: { icon: '〰', category: 'charts' },
	promptConfig: {
		defaultPrompt: 'Generate sparkline data showing a recent trend',
		systemInstruction:
			'You are a data analyst. Return an array of numeric data points representing a recent trend, plus an optional label.',
		model: 'GEMINI_2_5_FLASH',
		aiOutputSchema: sparklineAiOutputSchema,
		mapAiOutput: (out) => ({
			values: out.values,
			label: out.label ?? null
		})
	}
});

export { sparklineWidgetDataSchema, sparklineAiOutputSchema } from './schema.js';
export type { SparklineWidgetData, SparklineAiOutput } from './schema.js';
export { default as SparklineWidget } from './SparklineWidget.svelte';
