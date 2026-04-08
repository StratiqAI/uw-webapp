import { defineWidget } from '@stratiqai/dashboard-widget-sdk';
import { schemaWidgetDataSchema, schemaAiOutputSchema } from './schema.js';
import SchemaWidget from './SchemaWidget.svelte';
export const schemaWidget = defineWidget({
    kind: 'schema',
    displayName: 'Schema Widget',
    zodSchema: schemaWidgetDataSchema,
    component: SchemaWidget,
    defaultData: {
        schemaId: 'example-schema',
        data: {}
    },
    defaultSize: { colSpan: 6, rowSpan: 3 },
    palette: { icon: '📋', category: 'data' },
    entityDefinition: {
        name: 'Schema Widget Output',
        description: 'Structured output for schema widgets',
        outputSchema: schemaAiOutputSchema
    },
    promptConfig: {
        defaultPrompt: 'Generate structured data that conforms to the schema definition',
        systemInstruction: 'You are a data structuring assistant. Return data that matches the expected schema format.',
        model: 'GEMINI_2_5_FLASH',
        aiOutputSchema: schemaAiOutputSchema,
        mapAiOutput: (out) => ({
            data: out.data
        })
    }
});
export { schemaWidgetDataSchema, schemaAiOutputSchema } from './schema.js';
export { default as SchemaWidget } from './SchemaWidget.svelte';
