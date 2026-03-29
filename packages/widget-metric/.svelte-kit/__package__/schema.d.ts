import { z } from 'zod';
export declare const metricWidgetDataSchema: z.ZodObject<{
    /** Displayed in the widget card's header strip by the host dashboard. */
    title: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    /** Shown as a subtitle line beneath the title in the header strip. */
    description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    label: z.ZodString;
    value: z.ZodUnion<[z.ZodString, z.ZodNumber]>;
    change: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    changeType: z.ZodOptional<z.ZodNullable<z.ZodEnum<["increase", "decrease"]>>>;
    unit: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    label: string;
    value: string | number;
    title?: string | null | undefined;
    description?: string | null | undefined;
    change?: number | null | undefined;
    changeType?: "increase" | "decrease" | null | undefined;
    unit?: string | null | undefined;
}, {
    label: string;
    value: string | number;
    title?: string | null | undefined;
    description?: string | null | undefined;
    change?: number | null | undefined;
    changeType?: "increase" | "decrease" | null | undefined;
    unit?: string | null | undefined;
}>;
export type MetricWidgetData = z.infer<typeof metricWidgetDataSchema>;
