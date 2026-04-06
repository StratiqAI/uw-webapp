import { defineWidget } from '@stratiqai/dashboard-widget-sdk';
import { divergingBarChartWidgetDataSchema, divergingBarChartAiOutputSchema } from './schema.js';
import DivergingBarChartWidget from './DivergingBarChartWidget.svelte';

export const divergingBarChartWidget = defineWidget({
	kind: 'divergingBarChart',
	displayName: 'Diverging Bar',
	zodSchema: divergingBarChartWidgetDataSchema,
	component: DivergingBarChartWidget,
	defaultData: {
		labels: ['Strongly disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly agree'],
		values: [-24, -18, 12, 32, 42],
		positiveColor: '#3b82f6',
		negativeColor: '#ef4444'
	},
	defaultSize: { colSpan: 6, rowSpan: 3 },
	palette: { icon: '↔', category: 'charts' },
	promptConfig: {
		defaultPrompt: 'Generate a diverging bar chart comparing positive and negative values',
		systemInstruction:
			'You are a data visualization assistant. Return diverging bar chart data with labels and positive/negative values.',
		model: 'GEMINI_2_5_FLASH',
		aiOutputSchema: divergingBarChartAiOutputSchema,
		mapAiOutput: (out) => ({
			labels: out.labels,
			values: out.values
		})
	}
});

export { divergingBarChartWidgetDataSchema, divergingBarChartAiOutputSchema } from './schema.js';
export type { DivergingBarChartWidgetData, DivergingBarChartAiOutput } from './schema.js';
export { default as DivergingBarChartWidget } from './DivergingBarChartWidget.svelte';
