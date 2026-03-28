import { defineWidget } from '@stratiqai/dashboard-widget-sdk';
import { metricWidgetDataSchema } from './schema.js';
import MetricWidget from './MetricWidget.svelte';

export const metricWidget = defineWidget({
	kind: 'metric',
	displayName: 'Metric Widget',
	zodSchema: metricWidgetDataSchema,
	component: MetricWidget,
	defaultData: { label: '\u2014', value: '\u2014' },
	defaultSize: { colSpan: 2, rowSpan: 1 }
});

export { metricWidgetDataSchema, type MetricWidgetData } from './schema.js';
export { default as MetricWidget } from './MetricWidget.svelte';
