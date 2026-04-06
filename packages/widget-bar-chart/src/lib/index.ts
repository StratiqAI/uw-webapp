import { defineWidget } from '@stratiqai/dashboard-widget-sdk';
import { barChartWidgetDataSchema } from './schema.js';
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
	palette: { icon: '📊', category: 'charts' }
});

export { barChartWidgetDataSchema } from './schema.js';
export type { BarChartWidgetData } from './schema.js';
export { default as BarChartWidget } from './BarChartWidget.svelte';
