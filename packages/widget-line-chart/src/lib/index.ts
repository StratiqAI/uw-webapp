import { defineWidget } from '@stratiqai/dashboard-widget-sdk';
import { lineChartWidgetDataSchema } from './schema.js';
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
	palette: { icon: '📈', category: 'charts' }
});

export { lineChartWidgetDataSchema } from './schema.js';
export type { LineChartWidgetData } from './schema.js';
export { default as LineChartWidget } from './LineChartWidget.svelte';
