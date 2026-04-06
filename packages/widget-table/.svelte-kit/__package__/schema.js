import { z } from 'zod';
export const columnDefSchema = z.object({
    key: z.string(),
    label: z.string().optional(),
    type: z.enum(['text', 'number', 'currency', 'percent']).optional(),
    align: z.enum(['left', 'center', 'right']).optional(),
    width: z.string().optional()
});
export const tableWidgetDataSchema = z.object({
    title: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    /** Explicit header names. When omitted, auto-detected from row keys. */
    headers: z.array(z.string()).optional(),
    /** Rich column definitions with formatting/alignment. Takes priority over headers. */
    columns: z.array(columnDefSchema).optional(),
    rows: z.array(z.record(z.unknown())),
    sortable: z.boolean().optional().default(true),
    paginated: z.boolean().optional().default(true),
    pageSize: z.number().optional().default(10),
    searchable: z.boolean().optional().default(true)
});
export const tableAiOutputSchema = z.object({
    columns: z.array(z.object({
        key: z.string().describe('Column identifier/key'),
        label: z.string().optional().describe('Display label for the column header'),
        type: z.enum(['text', 'number', 'currency', 'percent']).optional().describe('Data type for formatting')
    })).describe('Column definitions for the table'),
    rows: z.array(z.record(z.unknown())).describe('Array of row objects keyed by column key')
});
