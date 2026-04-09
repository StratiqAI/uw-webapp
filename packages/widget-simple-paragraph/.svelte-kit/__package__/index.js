import { defineWidget } from '@stratiqai/dashboard-widget-sdk';
import { paragraphSchema } from './schema.js';
import SimpleParagraphWidget from './SimpleParagraphWidget.svelte';
export const simpleParagraphWidget = defineWidget({
    kind: 'simpleParagraph',
    displayName: 'Simple Paragraph',
    zodSchema: paragraphSchema,
    component: SimpleParagraphWidget,
    defaultData: { title: '', description: '', content: '' },
    defaultSize: { colSpan: 6, rowSpan: 3 },
    palette: { icon: '📝', category: 'content' },
    entityDefinition: {
        name: 'Paragraph',
        description: 'A single paragraph with title, subtitle, and prose content',
        outputSchema: paragraphSchema
    },
    promptConfig: {
        defaultPrompt: 'Write a paragraph about the economy around the property',
        systemInstruction: 'You are a helpful assistant that writes clear, informative paragraphs. ' +
            'Return exactly one object with title, description, and content fields. ' +
            'The content field must be a single paragraph of plain prose text — never JSON, arrays, or bullet lists.',
        model: 'GEMINI_2_5_FLASH',
        aiOutputSchema: paragraphSchema
    }
});
export { paragraphSchema } from './schema.js';
export { default as SimpleParagraphWidget } from './SimpleParagraphWidget.svelte';
