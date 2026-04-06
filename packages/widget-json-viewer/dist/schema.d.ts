import { z } from 'zod';
export declare const jsonViewerWidgetDataSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    json: z.ZodUnknown;
}, "strip", z.ZodTypeAny, {
    title?: string | null | undefined;
    description?: string | null | undefined;
    json?: unknown;
}, {
    title?: string | null | undefined;
    description?: string | null | undefined;
    json?: unknown;
}>;
export type JsonViewerWidgetData = z.infer<typeof jsonViewerWidgetDataSchema>;
export declare const jsonViewerAiOutputSchema: z.ZodObject<{
    data: z.ZodRecord<z.ZodString, z.ZodUnknown>;
}, "strip", z.ZodTypeAny, {
    data: Record<string, unknown>;
}, {
    data: Record<string, unknown>;
}>;
export type JsonViewerAiOutput = z.infer<typeof jsonViewerAiOutputSchema>;
