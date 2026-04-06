import { defineWidget } from '@stratiqai/dashboard-widget-sdk';
import { sparklineWidgetDataSchema } from './schema.js';
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
	palette: { icon: '〰', category: 'charts' }
});

export { sparklineWidgetDataSchema } from './schema.js';
export type { SparklineWidgetData } from './schema.js';
export { default as SparklineWidget } from './SparklineWidget.svelte';
