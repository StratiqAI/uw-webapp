import { z } from 'zod';
export declare const barChartWidgetDataSchema: z.ZodObject<{
    datasets: z.ZodArray<z.ZodObject<{
        label: z.ZodString;
        data: z.ZodArray<z.ZodNumber, "many">;
        backgroundColor: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        label: string;
        data: number[];
        backgroundColor?: string | null | undefined;
    }, {
        label: string;
        data: number[];
        backgroundColor?: string | null | undefined;
    }>, "many">;
    labels: z.ZodArray<z.ZodString, "many">;
    orientation: z.ZodOptional<z.ZodNullable<z.ZodEnum<["vertical", "horizontal"]>>>;
}, "strip", z.ZodTypeAny, {
    datasets: {
        label: string;
        data: number[];
        backgroundColor?: string | null | undefined;
    }[];
    labels: string[];
    orientation?: "vertical" | "horizontal" | null | undefined;
}, {
    datasets: {
        label: string;
        data: number[];
        backgroundColor?: string | null | undefined;
    }[];
    labels: string[];
    orientation?: "vertical" | "horizontal" | null | undefined;
}>;
export type BarChartWidgetData = z.infer<typeof barChartWidgetDataSchema>;
export declare const barChartAiOutputSchema: z.ZodObject<{
    labels: z.ZodArray<z.ZodString, "many">;
    datasets: z.ZodArray<z.ZodObject<{
        label: z.ZodString;
        data: z.ZodArray<z.ZodNumber, "many">;
        backgroundColor: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        label: string;
        data: number[];
        backgroundColor?: string | null | undefined;
    }, {
        label: string;
        data: number[];
        backgroundColor?: string | null | undefined;
    }>, "many">;
    orientation: z.ZodOptional<z.ZodNullable<z.ZodEnum<["vertical", "horizontal"]>>>;
}, "strip", z.ZodTypeAny, {
    datasets: {
        label: string;
        data: number[];
        backgroundColor?: string | null | undefined;
    }[];
    labels: string[];
    orientation?: "vertical" | "horizontal" | null | undefined;
}, {
    datasets: {
        label: string;
        data: number[];
        backgroundColor?: string | null | undefined;
    }[];
    labels: string[];
    orientation?: "vertical" | "horizontal" | null | undefined;
}>;
export type BarChartAiOutput = z.infer<typeof barChartAiOutputSchema>;
