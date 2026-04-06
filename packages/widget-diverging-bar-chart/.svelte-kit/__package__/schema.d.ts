import { z } from 'zod';
export declare const divergingBarChartWidgetDataSchema: z.ZodObject<{
    labels: z.ZodArray<z.ZodString, "many">;
    values: z.ZodArray<z.ZodNumber, "many">;
    positiveColor: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    negativeColor: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    labels: string[];
    values: number[];
    positiveColor?: string | null | undefined;
    negativeColor?: string | null | undefined;
}, {
    labels: string[];
    values: number[];
    positiveColor?: string | null | undefined;
    negativeColor?: string | null | undefined;
}>;
export type DivergingBarChartWidgetData = z.infer<typeof divergingBarChartWidgetDataSchema>;
export declare const divergingBarChartAiOutputSchema: z.ZodObject<{
    labels: z.ZodArray<z.ZodString, "many">;
    values: z.ZodArray<z.ZodNumber, "many">;
}, "strip", z.ZodTypeAny, {
    labels: string[];
    values: number[];
}, {
    labels: string[];
    values: number[];
}>;
export type DivergingBarChartAiOutput = z.infer<typeof divergingBarChartAiOutputSchema>;
