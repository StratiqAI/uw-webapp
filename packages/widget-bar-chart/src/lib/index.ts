import { defineWidget } from '@stratiqai/dashboard-widget-sdk';
import { barChartWidgetDataSchema, barChartAiOutputSchema } from './schema.js';
import BarChartWidget from './BarChartWidget.svelte';

export const barChartWidget = defineWidget({
	kind: 'barChart',
	displayName: 'Bar Chart',
	zodSchema: barChartWidgetDataSchema,
	component: BarChartWidget,
	defaultData: {
		labels: ['A', 'B', 'C'],
		datasets: [
			{ label: 'Count', data: [10, 20, 15], backgroundColor: '#3b82f6' }
		],
		orientation: 'vertical'
	},
	defaultSize: { colSpan: 6, rowSpan: 3 },
	palette: { icon: '📊', category: 'charts' },
	entityDefinition: {
		name: 'Bar Chart Output',
		description: 'Structured output for bar chart widgets',
		outputSchema: barChartAiOutputSchema
	},
	promptConfig: {
		defaultPrompt: 'Generate a bar chart comparing key property metrics',
		systemInstruction:
			'You are a data visualization assistant. Return structured bar chart data with labels and datasets. ' +
			'Use descriptive labels and meaningful color choices.',
		model: 'GEMINI_2_5_FLASH',
		aiOutputSchema: barChartAiOutputSchema,
		mapAiOutput: (out) => ({
			labels: out.labels,
			datasets: out.datasets,
			orientation: out.orientation ?? 'vertical'
		})
	}
});

export { barChartWidgetDataSchema, barChartAiOutputSchema } from './schema.js';
export type { BarChartWidgetData, BarChartAiOutput } from './schema.js';
export { default as BarChartWidget } from './BarChartWidget.svelte';
