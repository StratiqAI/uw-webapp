import { z } from 'zod';
export declare const areaChartWidgetDataSchema: z.ZodObject<{
    labels: z.ZodArray<z.ZodString, "many">;
    datasets: z.ZodArray<z.ZodObject<{
        label: z.ZodString;
        data: z.ZodArray<z.ZodNumber, "many">;
        color: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        label: string;
        data: number[];
        color?: string | null | undefined;
    }, {
        label: string;
        data: number[];
        color?: string | null | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    labels: string[];
    datasets: {
        label: string;
        data: number[];
        color?: string | null | undefined;
    }[];
}, {
    labels: string[];
    datasets: {
        label: string;
        data: number[];
        color?: string | null | undefined;
    }[];
}>;
export type AreaChartWidgetData = z.infer<typeof areaChartWidgetDataSchema>;
export declare const areaChartAiOutputSchema: z.ZodObject<{
    labels: z.ZodArray<z.ZodString, "many">;
    datasets: z.ZodArray<z.ZodObject<{
        label: z.ZodString;
        data: z.ZodArray<z.ZodNumber, "many">;
        color: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        label: string;
        data: number[];
        color?: string | null | undefined;
    }, {
        label: string;
        data: number[];
        color?: string | null | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    labels: string[];
    datasets: {
        label: string;
        data: number[];
        color?: string | null | undefined;
    }[];
}, {
    labels: string[];
    datasets: {
        label: string;
        data: number[];
        color?: string | null | undefined;
    }[];
}>;
export type AreaChartAiOutput = z.infer<typeof areaChartAiOutputSchema>;
