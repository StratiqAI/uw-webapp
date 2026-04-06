import { defineWidget } from '@stratiqai/dashboard-widget-sdk';
import { divergingBarChartWidgetDataSchema } from './schema.js';
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
	palette: { icon: '↔', category: 'charts' }
});

export { divergingBarChartWidgetDataSchema } from './schema.js';
export type { DivergingBarChartWidgetData } from './schema.js';
export { default as DivergingBarChartWidget } from './DivergingBarChartWidget.svelte';
