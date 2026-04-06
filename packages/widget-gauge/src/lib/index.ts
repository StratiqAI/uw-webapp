import { defineWidget } from '@stratiqai/dashboard-widget-sdk';
import { gaugeWidgetDataSchema } from './schema.js';
import GaugeWidget from './GaugeWidget.svelte';

export const gaugeWidget = defineWidget({
	kind: 'gauge',
	displayName: 'Gauge',
	zodSchema: gaugeWidgetDataSchema,
	component: GaugeWidget,
	defaultData: {
		value: 72,
		min: 0,
		max: 100,
		label: 'Score',
		unit: '%',
		color: '#22c55e'
	},
	defaultSize: { colSpan: 3, rowSpan: 2 },
	palette: { icon: '⏱', category: 'charts' }
});

export { gaugeWidgetDataSchema } from './schema.js';
export type { GaugeWidgetData } from './schema.js';
export { default as GaugeWidget } from './GaugeWidget.svelte';
