import { z } from 'zod';
export declare const brokerCardWidgetDataSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    fullName: z.ZodString;
    company: z.ZodString;
    phone: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    /** Up to ~4 characters shown in the avatar circle when no `avatarUrl`. */
    initials: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    avatarUrl: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    fullName: string;
    company: string;
    title?: string | null | undefined;
    description?: string | null | undefined;
    phone?: string | null | undefined;
    email?: string | null | undefined;
    initials?: string | null | undefined;
    avatarUrl?: string | null | undefined;
}, {
    fullName: string;
    company: string;
    title?: string | null | undefined;
    description?: string | null | undefined;
    phone?: string | null | undefined;
    email?: string | null | undefined;
    initials?: string | null | undefined;
    avatarUrl?: string | null | undefined;
}>;
export type BrokerCardWidgetData = z.infer<typeof brokerCardWidgetDataSchema>;
export declare const brokerCardAiOutputSchema: z.ZodObject<{
    fullName: z.ZodString;
    company: z.ZodString;
    phone: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    initials: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    fullName: string;
    company: string;
    phone?: string | null | undefined;
    email?: string | null | undefined;
    initials?: string | null | undefined;
}, {
    fullName: string;
    company: string;
    phone?: string | null | undefined;
    email?: string | null | undefined;
    initials?: string | null | undefined;
}>;
export type BrokerCardAiOutput = z.infer<typeof brokerCardAiOutputSchema>;
