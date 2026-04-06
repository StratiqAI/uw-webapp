import { z } from 'zod';
export declare const imageWidgetDataSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    src: z.ZodString;
    alt: z.ZodString;
    objectFit: z.ZodOptional<z.ZodNullable<z.ZodEnum<["cover", "contain", "fill"]>>>;
}, "strip", z.ZodTypeAny, {
    src: string;
    alt: string;
    title?: string | null | undefined;
    objectFit?: "cover" | "contain" | "fill" | null | undefined;
}, {
    src: string;
    alt: string;
    title?: string | null | undefined;
    objectFit?: "cover" | "contain" | "fill" | null | undefined;
}>;
export type ImageWidgetData = z.infer<typeof imageWidgetDataSchema>;
export declare const imageAiOutputSchema: z.ZodObject<{
    src: z.ZodString;
    alt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    src: string;
    alt: string;
}, {
    src: string;
    alt: string;
}>;
export type ImageAiOutput = z.infer<typeof imageAiOutputSchema>;
