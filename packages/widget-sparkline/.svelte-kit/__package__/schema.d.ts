import { z } from 'zod';
export declare const sparklineWidgetDataSchema: z.ZodObject<{
    values: z.ZodArray<z.ZodNumber, "many">;
    label: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    color: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    values: number[];
    label?: string | null | undefined;
    color?: string | null | undefined;
}, {
    values: number[];
    label?: string | null | undefined;
    color?: string | null | undefined;
}>;
export type SparklineWidgetData = z.infer<typeof sparklineWidgetDataSchema>;
export declare const sparklineAiOutputSchema: z.ZodObject<{
    values: z.ZodArray<z.ZodNumber, "many">;
    label: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    values: number[];
    label?: string | null | undefined;
}, {
    values: number[];
    label?: string | null | undefined;
}>;
export type SparklineAiOutput = z.infer<typeof sparklineAiOutputSchema>;
