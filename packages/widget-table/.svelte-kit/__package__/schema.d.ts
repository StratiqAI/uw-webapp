import { z } from 'zod';
export declare const columnDefSchema: z.ZodObject<{
    key: z.ZodString;
    label: z.ZodOptional<z.ZodString>;
    type: z.ZodOptional<z.ZodEnum<["text", "number", "currency", "percent"]>>;
    align: z.ZodOptional<z.ZodEnum<["left", "center", "right"]>>;
    width: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    key: string;
    label?: string | undefined;
    type?: "number" | "text" | "currency" | "percent" | undefined;
    align?: "left" | "center" | "right" | undefined;
    width?: string | undefined;
}, {
    key: string;
    label?: string | undefined;
    type?: "number" | "text" | "currency" | "percent" | undefined;
    align?: "left" | "center" | "right" | undefined;
    width?: string | undefined;
}>;
export declare const tableWidgetDataSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    /** Explicit header names. When omitted, auto-detected from row keys. */
    headers: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    /** Rich column definitions with formatting/alignment. Takes priority over headers. */
    columns: z.ZodOptional<z.ZodArray<z.ZodObject<{
        key: z.ZodString;
        label: z.ZodOptional<z.ZodString>;
        type: z.ZodOptional<z.ZodEnum<["text", "number", "currency", "percent"]>>;
        align: z.ZodOptional<z.ZodEnum<["left", "center", "right"]>>;
        width: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        key: string;
        label?: string | undefined;
        type?: "number" | "text" | "currency" | "percent" | undefined;
        align?: "left" | "center" | "right" | undefined;
        width?: string | undefined;
    }, {
        key: string;
        label?: string | undefined;
        type?: "number" | "text" | "currency" | "percent" | undefined;
        align?: "left" | "center" | "right" | undefined;
        width?: string | undefined;
    }>, "many">>;
    rows: z.ZodArray<z.ZodRecord<z.ZodString, z.ZodUnknown>, "many">;
    sortable: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    paginated: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    pageSize: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    searchable: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
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
}, {
    rows: Record<string, unknown>[];
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
    sortable?: boolean | undefined;
    paginated?: boolean | undefined;
    pageSize?: number | undefined;
    searchable?: boolean | undefined;
}>;
export type TableWidgetData = z.infer<typeof tableWidgetDataSchema>;
export type ColumnDef = z.infer<typeof columnDefSchema>;
export declare const tableAiOutputSchema: z.ZodObject<{
    columns: z.ZodArray<z.ZodObject<{
        key: z.ZodString;
        label: z.ZodOptional<z.ZodString>;
        type: z.ZodOptional<z.ZodEnum<["text", "number", "currency", "percent"]>>;
    }, "strip", z.ZodTypeAny, {
        key: string;
        label?: string | undefined;
        type?: "number" | "text" | "currency" | "percent" | undefined;
    }, {
        key: string;
        label?: string | undefined;
        type?: "number" | "text" | "currency" | "percent" | undefined;
    }>, "many">;
    rows: z.ZodArray<z.ZodRecord<z.ZodString, z.ZodUnknown>, "many">;
}, "strip", z.ZodTypeAny, {
    columns: {
        key: string;
        label?: string | undefined;
        type?: "number" | "text" | "currency" | "percent" | undefined;
    }[];
    rows: Record<string, unknown>[];
}, {
    columns: {
        key: string;
        label?: string | undefined;
        type?: "number" | "text" | "currency" | "percent" | undefined;
    }[];
    rows: Record<string, unknown>[];
}>;
export type TableAiOutput = z.infer<typeof tableAiOutputSchema>;
