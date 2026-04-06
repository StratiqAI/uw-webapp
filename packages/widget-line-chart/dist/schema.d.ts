import { z } from 'zod';
export declare const lineChartWidgetDataSchema: z.ZodObject<{
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
    labels: z.ZodArray<z.ZodString, "many">;
    options: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        responsive: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
        maintainAspectRatio: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
    }, "strip", z.ZodTypeAny, {
        responsive?: boolean | null | undefined;
        maintainAspectRatio?: boolean | null | undefined;
    }, {
        responsive?: boolean | null | undefined;
        maintainAspectRatio?: boolean | null | undefined;
    }>>>;
}, "strip", z.ZodTypeAny, {
    datasets: {
        label: string;
        data: number[];
        color?: string | null | undefined;
    }[];
    labels: string[];
    options?: {
        responsive?: boolean | null | undefined;
        maintainAspectRatio?: boolean | null | undefined;
    } | null | undefined;
}, {
    datasets: {
        label: string;
        data: number[];
        color?: string | null | undefined;
    }[];
    labels: string[];
    options?: {
        responsive?: boolean | null | undefined;
        maintainAspectRatio?: boolean | null | undefined;
    } | null | undefined;
}>;
export type LineChartWidgetData = z.infer<typeof lineChartWidgetDataSchema>;
export declare const lineChartAiOutputSchema: z.ZodObject<{
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
    datasets: {
        label: string;
        data: number[];
        color?: string | null | undefined;
    }[];
    labels: string[];
}, {
    datasets: {
        label: string;
        data: number[];
        color?: string | null | undefined;
    }[];
    labels: string[];
}>;
export type LineChartAiOutput = z.infer<typeof lineChartAiOutputSchema>;
