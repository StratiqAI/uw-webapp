import { z } from 'zod';
export declare const paragraphWidgetDataSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    content: z.ZodString;
    markdown: z.ZodDefault<z.ZodNullable<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    content: string;
    markdown: boolean | null;
    title?: string | null | undefined;
}, {
    content: string;
    title?: string | null | undefined;
    markdown?: boolean | null | undefined;
}>;
export type ParagraphWidgetData = z.infer<typeof paragraphWidgetDataSchema>;
/**
 * AI output schema: the shape the AI model must return.
 * The `text` field receives the main response text.
 */
export declare const paragraphAiOutputSchema: z.ZodObject<{
    text: z.ZodString;
}, "strip", z.ZodTypeAny, {
    text: string;
}, {
    text: string;
}>;
export type ParagraphAiOutput = z.infer<typeof paragraphAiOutputSchema>;
