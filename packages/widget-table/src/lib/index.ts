import { defineWidget } from '@stratiqai/dashboard-widget-sdk';
import { tableWidgetDataSchema } from './schema.js';
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
	palette: { icon: '\u{1F4CB}', category: 'data' }
});

export { tableWidgetDataSchema, type TableWidgetData, type ColumnDef } from './schema.js';
export { default as TableWidget } from './TableWidget.svelte';
