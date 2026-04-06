import { defineWidget } from '@stratiqai/dashboard-widget-sdk';
import { jsonViewerWidgetDataSchema, jsonViewerAiOutputSchema } from './schema.js';
import JsonViewerWidget from './JsonViewerWidget.svelte';

export const jsonViewerWidget = defineWidget({
	kind: 'jsonViewer',
	displayName: 'JSON Viewer',
	zodSchema: jsonViewerWidgetDataSchema,
	component: JsonViewerWidget,
	defaultData: { title: null, description: null, json: {} },
	defaultSize: { colSpan: 6, rowSpan: 3 },
	promptConfig: {
		defaultPrompt: 'Generate structured JSON data about this property',
		systemInstruction:
			'You are a data structuring assistant. ' +
			'Return well-organized JSON data with meaningful keys and values.',
		model: 'GEMINI_2_5_FLASH',
		aiOutputSchema: jsonViewerAiOutputSchema,
		mapAiOutput: (out) => ({
			json: out.data ?? {}
		})
	}
});

export { jsonViewerWidgetDataSchema, jsonViewerAiOutputSchema } from './schema.js';
export type { JsonViewerWidgetData, JsonViewerAiOutput } from './schema.js';
export { default as JsonViewerWidget } from './JsonViewerWidget.svelte';
