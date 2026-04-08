import { defineWidget } from '@stratiqai/dashboard-widget-sdk';
import { titleWidgetDataSchema, titleAiOutputSchema } from './schema.js';
import TitleWidget from './TitleWidget.svelte';

export const titleWidget = defineWidget({
	kind: 'title',
	displayName: 'Title Widget',
	zodSchema: titleWidgetDataSchema,
	component: TitleWidget,
	defaultData: { title: 'Untitled', subtitle: null, alignment: 'left' },
	defaultSize: { colSpan: 12, rowSpan: 1 },
	palette: { icon: '📝', category: 'content' },
	entityDefinition: {
		name: 'Title Widget Output',
		description: 'Structured output for title widgets',
		outputSchema: titleAiOutputSchema
	},
	promptConfig: {
		defaultPrompt: 'Generate a compelling title and subtitle for a real estate investment report',
		systemInstruction:
			'You are a professional copywriter specializing in commercial real estate. ' +
			'Generate concise, impactful titles and subtitles.',
		model: 'GEMINI_2_5_FLASH',
		aiOutputSchema: titleAiOutputSchema,
		mapAiOutput: (out) => ({
			title: (out.title as string) ?? 'Untitled',
			subtitle: (out.subtitle as string) ?? null
		})
	}
});

export { titleWidgetDataSchema, titleAiOutputSchema } from './schema.js';
export type { TitleWidgetData, TitleAiOutput } from './schema.js';
export { default as TitleWidget } from './TitleWidget.svelte';
