import { defineWidget } from '@stratiqai/dashboard-widget-sdk';
import { tableWidgetDataSchema, tableAiOutputSchema } from './schema.js';
import TableWidget from './TableWidget.svelte';
export const tableWidget = defineWidget({
    kind: 'table',
    displayName: 'Table',
    zodSchema: tableWidgetDataSchema,
    component: TableWidget,
    defaultData: {
        rows: [],
        sortable: true,
        paginated: true,
        pageSize: 10,
        searchable: true
    },
    defaultSize: { colSpan: 6, rowSpan: 3 },
    palette: { icon: '\u{1F4CB}', category: 'data' },
    promptConfig: {
        defaultPrompt: 'Generate a comparison table of key property metrics',
        systemInstruction: 'You are a commercial real estate data analyst. ' +
            'Return structured tabular data with column definitions and rows. ' +
            'Use appropriate column types (text, number, currency, percent) for formatting.',
        model: 'GEMINI_2_5_FLASH',
        aiOutputSchema: tableAiOutputSchema,
        mapAiOutput: (out) => ({
            columns: out.columns,
            rows: out.rows,
            sortable: true,
            paginated: true,
            pageSize: 10,
            searchable: true
        })
    }
});
export { tableWidgetDataSchema, tableAiOutputSchema } from './schema.js';
export { default as TableWidget } from './TableWidget.svelte';
