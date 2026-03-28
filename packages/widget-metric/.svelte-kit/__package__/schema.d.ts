import { z } from 'zod';
export declare const metricWidgetDataSchema: z.ZodObject<{
    label: z.ZodString;
    value: z.ZodUnion<[z.ZodString, z.ZodNumber]>;
    change: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    changeType: z.ZodOptional<z.ZodNullable<z.ZodEnum<["increase", "decrease"]>>>;
    unit: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    label: string;
    value: string | number;
    change?: number | null | undefined;
    changeType?: "increase" | "decrease" | null | undefined;
    unit?: string | null | undefined;
}, {
    label: string;
    value: string | number;
    change?: number | null | undefined;
    changeType?: "increase" | "decrease" | null | undefined;
    unit?: string | null | undefined;
}>;
export type MetricWidgetData = z.infer<typeof metricWidgetDataSchema>;
