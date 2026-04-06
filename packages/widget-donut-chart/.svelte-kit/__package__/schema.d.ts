import { z } from 'zod';
export declare const donutChartWidgetDataSchema: z.ZodObject<{
    labels: z.ZodArray<z.ZodString, "many">;
    values: z.ZodArray<z.ZodNumber, "many">;
    colors: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodString, "many">>>;
    centerLabel: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    labels: string[];
    values: number[];
    colors?: string[] | null | undefined;
    centerLabel?: string | null | undefined;
}, {
    labels: string[];
    values: number[];
    colors?: string[] | null | undefined;
    centerLabel?: string | null | undefined;
}>;
export type DonutChartWidgetData = z.infer<typeof donutChartWidgetDataSchema>;
export declare const donutChartAiOutputSchema: z.ZodObject<{
    labels: z.ZodArray<z.ZodString, "many">;
    values: z.ZodArray<z.ZodNumber, "many">;
    colors: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodString, "many">>>;
    centerLabel: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    labels: string[];
    values: number[];
    colors?: string[] | null | undefined;
    centerLabel?: string | null | undefined;
}, {
    labels: string[];
    values: number[];
    colors?: string[] | null | undefined;
    centerLabel?: string | null | undefined;
}>;
export type DonutChartAiOutput = z.infer<typeof donutChartAiOutputSchema>;
