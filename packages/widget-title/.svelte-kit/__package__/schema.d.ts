import { z } from 'zod';
export declare const titleWidgetDataSchema: z.ZodObject<{
    title: z.ZodString;
    subtitle: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    alignment: z.ZodOptional<z.ZodNullable<z.ZodEnum<["left", "center", "right"]>>>;
}, "strip", z.ZodTypeAny, {
    title: string;
    subtitle?: string | null | undefined;
    alignment?: "left" | "center" | "right" | null | undefined;
}, {
    title: string;
    subtitle?: string | null | undefined;
    alignment?: "left" | "center" | "right" | null | undefined;
}>;
export type TitleWidgetData = z.infer<typeof titleWidgetDataSchema>;
