export declare const tableWidget: import("@stratiqai/dashboard-widget-sdk").WidgetManifest<{
    rows: Record<string, unknown>[];
    sortable: boolean;
    paginated: boolean;
    pageSize: number;
    searchable: boolean;
    title?: string | null | undefined;
    description?: string | null | undefined;
    headers?: string[] | undefined;
    columns?: {
        key: string;
        label?: string | undefined;
        type?: "number" | "text" | "currency" | "percent" | undefined;
        align?: "left" | "center" | "right" | undefined;
        width?: string | undefined;
    }[] | undefined;
}>;
export { tableWidgetDataSchema, tableAiOutputSchema } from './schema.js';
export type { TableWidgetData, TableAiOutput, ColumnDef } from './schema.js';
export { default as TableWidget } from './TableWidget.svelte';
