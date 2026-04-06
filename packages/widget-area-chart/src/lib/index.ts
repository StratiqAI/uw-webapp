import { defineWidget } from '@stratiqai/dashboard-widget-sdk';
import { areaChartWidgetDataSchema } from './schema.js';
import AreaChartWidget from './AreaChartWidget.svelte';

export const areaChartWidget = defineWidget({
	kind: 'areaChart',
	displayName: 'Area Chart',
	zodSchema: areaChartWidgetDataSchema,
	component: AreaChartWidget,
	defaultData: {
		labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
		datasets: [
			{ label: 'Series 1', data: [20, 35, 45, 40, 55, 60], color: '#06b6d4' },
			{ label: 'Series 2', data: [10, 25, 30, 35, 40, 50], color: '#8b5cf6' }
		]
	},
	defaultSize: { colSpan: 6, rowSpan: 3 },
	palette: { icon: '📉', category: 'charts' }
});

export { areaChartWidgetDataSchema } from './schema.js';
export type { AreaChartWidgetData } from './schema.js';
export { default as AreaChartWidget } from './AreaChartWidget.svelte';
