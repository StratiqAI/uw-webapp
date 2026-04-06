import { z } from 'zod';
export declare const schemaWidgetDataSchema: z.ZodObject<{
    schemaId: z.ZodString;
    data: z.ZodOptional<z.ZodUnknown>;
}, "strip", z.ZodTypeAny, {
    schemaId: string;
    data?: unknown;
}, {
    schemaId: string;
    data?: unknown;
}>;
export type SchemaWidgetData = z.infer<typeof schemaWidgetDataSchema>;
