import { defineWidget } from '@stratiqai/dashboard-widget-sdk';
import { lineChartWidgetDataSchema, lineChartAiOutputSchema } from './schema.js';
import LineChartWidget from './LineChartWidget.svelte';

export const lineChartWidget = defineWidget({
	kind: 'lineChart',
	displayName: 'Line Chart',
	zodSchema: lineChartWidgetDataSchema,
	component: LineChartWidget,
	defaultData: {
		labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
		datasets: [
			{ label: 'Series 1', data: [28, 35, 42, 38, 45, 52], color: '#3b82f6' }
		],
		options: { responsive: true, maintainAspectRatio: false }
	},
	defaultSize: { colSpan: 6, rowSpan: 3 },
	palette: { icon: '📈', category: 'charts' },
	promptConfig: {
		defaultPrompt: 'Generate a line chart showing trends over time',
		systemInstruction:
			'You are a data visualization assistant. Return structured line chart data with time-series labels and datasets.',
		model: 'GEMINI_2_5_FLASH',
		aiOutputSchema: lineChartAiOutputSchema,
		mapAiOutput: (out) => ({
			labels: out.labels,
			datasets: out.datasets
		})
	}
});

export { lineChartWidgetDataSchema, lineChartAiOutputSchema } from './schema.js';
export type { LineChartWidgetData, LineChartAiOutput } from './schema.js';
export { default as LineChartWidget } from './LineChartWidget.svelte';
