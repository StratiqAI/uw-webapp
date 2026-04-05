import { defineWidget } from '@stratiqai/dashboard-widget-sdk';
import { paragraphWidgetDataSchema, paragraphAiOutputSchema } from './schema.js';
import ParagraphWidget from './ParagraphWidget.svelte';
export const paragraphWidget = defineWidget({
    kind: 'paragraph',
    displayName: 'Paragraph Widget',
    zodSchema: paragraphWidgetDataSchema,
    component: ParagraphWidget,
    defaultData: { title: null, content: '', markdown: false },
    defaultSize: { colSpan: 6, rowSpan: 3 },
    palette: { icon: '📄', category: 'content' },
    promptConfig: {
        defaultPrompt: 'Write a paragraph about the economy around the property',
        systemInstruction: 'You are a helpful assistant that writes clear, informative paragraphs. ' +
            'Structure your response as well-formatted content. ' +
            'Use markdown if it improves readability.',
        model: 'gpt-5-nano',
        aiOutputSchema: paragraphAiOutputSchema
    }
});
export { paragraphWidgetDataSchema, paragraphAiOutputSchema } from './schema.js';
export { default as ParagraphWidget } from './ParagraphWidget.svelte';
