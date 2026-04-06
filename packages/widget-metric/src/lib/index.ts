import { defineWidget } from '@stratiqai/dashboard-widget-sdk';
import { metricWidgetDataSchema, metricAiOutputSchema } from './schema.js';
import MetricWidget from './MetricWidget.svelte';

export const metricWidget = defineWidget({
	kind: 'metric',
	displayName: 'Metric Widget',
	zodSchema: metricWidgetDataSchema,
	component: MetricWidget,
	defaultData: { label: '\u2014', value: '\u2014' },
	defaultSize: { colSpan: 2, rowSpan: 1 },
	promptConfig: {
		defaultPrompt: 'Provide the key financial metric for this property',
		systemInstruction:
			'You are a commercial real estate analyst. ' +
			'Return a single key metric with its label, value, unit, and period-over-period change.',
		model: 'GEMINI_2_5_FLASH',
		aiOutputSchema: metricAiOutputSchema,
		mapAiOutput: (out) => ({
			label: (out.label as string) ?? '',
			value: out.value ?? '',
			unit: (out.unit as string) ?? null,
			change: (out.change as number) ?? null,
			changeType: (out.changeType as string) ?? null
		})
	}
});

export { metricWidgetDataSchema, metricAiOutputSchema } from './schema.js';
export type { MetricWidgetData, MetricAiOutput } from './schema.js';
export { default as MetricWidget } from './MetricWidget.svelte';
