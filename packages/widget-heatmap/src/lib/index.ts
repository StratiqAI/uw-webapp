import { defineWidget } from '@stratiqai/dashboard-widget-sdk';
import { heatmapWidgetDataSchema } from './schema.js';
import HeatmapWidget from './HeatmapWidget.svelte';

export const heatmapWidget = defineWidget({
	kind: 'heatmap',
	displayName: 'Heatmap',
	zodSchema: heatmapWidgetDataSchema,
	component: HeatmapWidget,
	defaultData: {
		rows: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
		cols: ['AM', 'PM'],
		values: [
			[4, 6],
			[3, 5],
			[5, 7],
			[2, 4],
			[6, 8]
		]
	},
	defaultSize: { colSpan: 6, rowSpan: 4 },
	palette: { icon: '🔥', category: 'charts' }
});

export { heatmapWidgetDataSchema } from './schema.js';
export type { HeatmapWidgetData } from './schema.js';
export { default as HeatmapWidget } from './HeatmapWidget.svelte';
