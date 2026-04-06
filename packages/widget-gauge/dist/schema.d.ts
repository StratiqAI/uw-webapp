import { z } from 'zod';
export declare const gaugeWidgetDataSchema: z.ZodObject<{
    value: z.ZodNumber;
    min: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    max: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    label: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    unit: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    color: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    value: number;
    min?: number | null | undefined;
    max?: number | null | undefined;
    label?: string | null | undefined;
    unit?: string | null | undefined;
    color?: string | null | undefined;
}, {
    value: number;
    min?: number | null | undefined;
    max?: number | null | undefined;
    label?: string | null | undefined;
    unit?: string | null | undefined;
    color?: string | null | undefined;
}>;
export type GaugeWidgetData = z.infer<typeof gaugeWidgetDataSchema>;
