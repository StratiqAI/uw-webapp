import { defineWidget } from '@stratiqai/dashboard-widget-sdk';
import { imageWidgetDataSchema, imageAiOutputSchema } from './schema.js';
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
	palette: { icon: '🖼', category: 'content' },
	promptConfig: {
		defaultPrompt: 'Find a relevant image URL for this property or topic',
		systemInstruction:
			'You are an image research assistant. Return a publicly accessible image URL and descriptive alt text.',
		model: 'GEMINI_2_5_FLASH',
		aiOutputSchema: imageAiOutputSchema,
		mapAiOutput: (out) => ({
			src: (out.src as string) ?? '',
			alt: (out.alt as string) ?? 'AI-generated image'
		})
	}
});

export { imageWidgetDataSchema, imageAiOutputSchema } from './schema.js';
export type { ImageWidgetData, ImageAiOutput } from './schema.js';
export { default as ImageWidget } from './ImageWidget.svelte';
