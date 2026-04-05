import { z } from 'zod';
export declare const lfprTrendYearSchema: z.ZodObject<{
    year: z.ZodString;
    rate: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    year: string;
    rate: number;
}, {
    year: string;
    rate: number;
}>;
export type LfprTrendYear = z.infer<typeof lfprTrendYearSchema>;
export declare const lfprDriverSchema: z.ZodObject<{
    label: z.ZodString;
    impact: z.ZodEnum<["high", "moderate", "low"]>;
    description: z.ZodString;
}, "strip", z.ZodTypeAny, {
    label: string;
    impact: "high" | "moderate" | "low";
    description: string;
}, {
    label: string;
    impact: "high" | "moderate" | "low";
    description: string;
}>;
export type LfprDriver = z.infer<typeof lfprDriverSchema>;
export declare const lfprDashboardConfigSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    adultPopulation: z.ZodNumber;
    adultPopYoy: z.ZodNumber;
    laborForce: z.ZodNumber;
    laborForceYoy: z.ZodNumber;
    lfpr: z.ZodNumber;
    lfprDirection: z.ZodEnum<["up", "down", "flat"]>;
    trendData: z.ZodArray<z.ZodObject<{
        year: z.ZodString;
        rate: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        year: string;
        rate: number;
    }, {
        year: string;
        rate: number;
    }>, "many">;
    growthDrivers: z.ZodArray<z.ZodObject<{
        label: z.ZodString;
        impact: z.ZodEnum<["high", "moderate", "low"]>;
        description: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        label: string;
        impact: "high" | "moderate" | "low";
        description: string;
    }, {
        label: string;
        impact: "high" | "moderate" | "low";
        description: string;
    }>, "many">;
    dragDrivers: z.ZodArray<z.ZodObject<{
        label: z.ZodString;
        impact: z.ZodEnum<["high", "moderate", "low"]>;
        description: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        label: string;
        impact: "high" | "moderate" | "low";
        description: string;
    }, {
        label: string;
        impact: "high" | "moderate" | "low";
        description: string;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    adultPopulation: number;
    adultPopYoy: number;
    laborForce: number;
    laborForceYoy: number;
    lfpr: number;
    lfprDirection: "flat" | "up" | "down";
    trendData: {
        year: string;
        rate: number;
    }[];
    growthDrivers: {
        label: string;
        impact: "high" | "moderate" | "low";
        description: string;
    }[];
    dragDrivers: {
        label: string;
        impact: "high" | "moderate" | "low";
        description: string;
    }[];
    title?: string | undefined;
}, {
    adultPopulation: number;
    adultPopYoy: number;
    laborForce: number;
    laborForceYoy: number;
    lfpr: number;
    lfprDirection: "flat" | "up" | "down";
    trendData: {
        year: string;
        rate: number;
    }[];
    growthDrivers: {
        label: string;
        impact: "high" | "moderate" | "low";
        description: string;
    }[];
    dragDrivers: {
        label: string;
        impact: "high" | "moderate" | "low";
        description: string;
    }[];
    title?: string | undefined;
}>;
export type LfprDashboardConfig = z.infer<typeof lfprDashboardConfigSchema>;
