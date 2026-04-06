import { defineWidget } from '@stratiqai/dashboard-widget-sdk';
import { imageWidgetDataSchema } from './schema.js';
import ImageWidget from './ImageWidget.svelte';

export const imageWidget = defineWidget({
	kind: 'image',
	displayName: 'Image',
	zodSchema: imageWidgetDataSchema,
	component: ImageWidget,
	defaultData: {
		title: null,
		src: 'https://via.placeholder.com/400x300',
		alt: 'Image',
		objectFit: 'cover'
	},
	defaultSize: { colSpan: 6, rowSpan: 4 },
	palette: { icon: '🖼', category: 'content' }
});

export { imageWidgetDataSchema } from './schema.js';
export type { ImageWidgetData } from './schema.js';
export { default as ImageWidget } from './ImageWidget.svelte';
