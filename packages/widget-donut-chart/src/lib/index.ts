import { defineWidget } from '@stratiqai/dashboard-widget-sdk';
import { donutChartWidgetDataSchema, donutChartAiOutputSchema } from './schema.js';
import DonutChartWidget from './DonutChartWidget.svelte';

export const donutChartWidget = defineWidget({
	kind: 'donutChart',
	displayName: 'Donut Chart',
	zodSchema: donutChartWidgetDataSchema,
	component: DonutChartWidget,
	defaultData: {
		labels: ['A', 'B', 'C', 'D'],
		values: [28, 22, 35, 15],
		colors: ['#6366f1', '#8b5cf6', '#a855f7', '#c084fc'],
		centerLabel: 'Total'
	},
	defaultSize: { colSpan: 4, rowSpan: 3 },
	palette: { icon: '🍩', category: 'charts' },
	promptConfig: {
		defaultPrompt: 'Generate a donut chart showing the breakdown of categories',
		systemInstruction:
			'You are a data visualization assistant. Return donut chart data with labels, values, and optional colors.',
		model: 'GEMINI_2_5_FLASH',
		aiOutputSchema: donutChartAiOutputSchema,
		mapAiOutput: (out) => ({
			labels: out.labels,
			values: out.values,
			colors: out.colors ?? null,
			centerLabel: out.centerLabel ?? null
		})
	}
});

export { donutChartWidgetDataSchema, donutChartAiOutputSchema } from './schema.js';
export type { DonutChartWidgetData, DonutChartAiOutput } from './schema.js';
export { default as DonutChartWidget } from './DonutChartWidget.svelte';
