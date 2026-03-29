import { defineWidget } from '@stratiqai/dashboard-widget-sdk';
import { jsonViewerWidgetDataSchema } from './schema.js';
import JsonViewerWidget from './JsonViewerWidget.svelte';
export const jsonViewerWidget = defineWidget({
    kind: 'jsonViewer',
    displayName: 'JSON Viewer',
    zodSchema: jsonViewerWidgetDataSchema,
    component: JsonViewerWidget,
    defaultData: { title: null, description: null, json: {} },
    defaultSize: { colSpan: 6, rowSpan: 3 }
});
export { jsonViewerWidgetDataSchema } from './schema.js';
export { default as JsonViewerWidget } from './JsonViewerWidget.svelte';
