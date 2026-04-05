import { defineWidget } from '@stratiqai/dashboard-widget-sdk';
import { titleWidgetDataSchema } from './schema.js';
import TitleWidget from './TitleWidget.svelte';
export const titleWidget = defineWidget({
    kind: 'title',
    displayName: 'Title Widget',
    zodSchema: titleWidgetDataSchema,
    component: TitleWidget,
    defaultData: { title: 'Untitled', subtitle: null, alignment: 'left' },
    defaultSize: { colSpan: 12, rowSpan: 1 },
    palette: { icon: '📝', category: 'content' }
});
export { titleWidgetDataSchema } from './schema.js';
export { default as TitleWidget } from './TitleWidget.svelte';
