import { z } from 'zod';
export declare const heatmapWidgetDataSchema: z.ZodObject<{
    rows: z.ZodArray<z.ZodString, "many">;
    cols: z.ZodArray<z.ZodString, "many">;
    values: z.ZodArray<z.ZodArray<z.ZodNumber, "many">, "many">;
}, "strip", z.ZodTypeAny, {
    rows: string[];
    values: number[][];
    cols: string[];
}, {
    rows: string[];
    values: number[][];
    cols: string[];
}>;
export type HeatmapWidgetData = z.infer<typeof heatmapWidgetDataSchema>;
export declare const heatmapAiOutputSchema: z.ZodObject<{
    rows: z.ZodArray<z.ZodString, "many">;
    cols: z.ZodArray<z.ZodString, "many">;
    values: z.ZodArray<z.ZodArray<z.ZodNumber, "many">, "many">;
}, "strip", z.ZodTypeAny, {
    rows: string[];
    values: number[][];
    cols: string[];
}, {
    rows: string[];
    values: number[][];
    cols: string[];
}>;
export type HeatmapAiOutput = z.infer<typeof heatmapAiOutputSchema>;
