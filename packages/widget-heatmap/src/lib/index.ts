import { defineWidget } from '@stratiqai/dashboard-widget-sdk';
import { heatmapWidgetDataSchema, heatmapAiOutputSchema } from './schema.js';
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
	palette: { icon: '🔥', category: 'charts' },
	promptConfig: {
		defaultPrompt: 'Generate a heatmap showing intensity across categories and time periods',
		systemInstruction:
			'You are a data visualization assistant. Return a 2D matrix of values with row and column labels for a heatmap.',
		model: 'GEMINI_2_5_FLASH',
		aiOutputSchema: heatmapAiOutputSchema,
		mapAiOutput: (out) => ({
			rows: out.rows,
			cols: out.cols,
			values: out.values
		})
	}
});

export { heatmapWidgetDataSchema, heatmapAiOutputSchema } from './schema.js';
export type { HeatmapWidgetData, HeatmapAiOutput } from './schema.js';
export { default as HeatmapWidget } from './HeatmapWidget.svelte';
