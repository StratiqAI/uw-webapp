import { defineWidget } from '@stratiqai/dashboard-widget-sdk';
import { donutChartWidgetDataSchema } from './schema.js';
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
	palette: { icon: '🍩', category: 'charts' }
});

export { donutChartWidgetDataSchema } from './schema.js';
export type { DonutChartWidgetData } from './schema.js';
export { default as DonutChartWidget } from './DonutChartWidget.svelte';
