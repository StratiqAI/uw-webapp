import { z } from 'zod';
export declare const quarterMetricsSchema: z.ZodObject<{
    empYoy: z.ZodNumber;
    lqValue: z.ZodNumber;
    wageYoy: z.ZodNumber;
    estabYoy: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    empYoy: number;
    lqValue: number;
    wageYoy: number;
    estabYoy: number;
}, {
    empYoy: number;
    lqValue: number;
    wageYoy: number;
    estabYoy: number;
}>;
export type QuarterMetrics = z.infer<typeof quarterMetricsSchema>;
export declare const lqTrendEnum: z.ZodEnum<["rising", "stable", "falling"]>;
export type LqTrend = z.infer<typeof lqTrendEnum>;
export declare const industryDataSchema: z.ZodObject<{
    name: z.ZodString;
    naicsCode: z.ZodString;
    color: z.ZodString;
    lqTrend: z.ZodEnum<["rising", "stable", "falling"]>;
    data: z.ZodArray<z.ZodObject<{
        empYoy: z.ZodNumber;
        lqValue: z.ZodNumber;
        wageYoy: z.ZodNumber;
        estabYoy: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        empYoy: number;
        lqValue: number;
        wageYoy: number;
        estabYoy: number;
    }, {
        empYoy: number;
        lqValue: number;
        wageYoy: number;
        estabYoy: number;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    name: string;
    naicsCode: string;
    color: string;
    lqTrend: "rising" | "stable" | "falling";
    data: {
        empYoy: number;
        lqValue: number;
        wageYoy: number;
        estabYoy: number;
    }[];
}, {
    name: string;
    naicsCode: string;
    color: string;
    lqTrend: "rising" | "stable" | "falling";
    data: {
        empYoy: number;
        lqValue: number;
        wageYoy: number;
        estabYoy: number;
    }[];
}>;
export type IndustryData = z.infer<typeof industryDataSchema>;
export declare const scoreWeightsSchema: z.ZodObject<{
    emp: z.ZodNumber;
    lq: z.ZodNumber;
    wage: z.ZodNumber;
    estab: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    emp: number;
    lq: number;
    wage: number;
    estab: number;
}, {
    emp: number;
    lq: number;
    wage: number;
    estab: number;
}>;
export type ScoreWeights = z.infer<typeof scoreWeightsSchema>;
export declare const industryTrendScorecardConfigSchema: z.ZodObject<{
    quarters: z.ZodArray<z.ZodString, "many">;
    industries: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        naicsCode: z.ZodString;
        color: z.ZodString;
        lqTrend: z.ZodEnum<["rising", "stable", "falling"]>;
        data: z.ZodArray<z.ZodObject<{
            empYoy: z.ZodNumber;
            lqValue: z.ZodNumber;
            wageYoy: z.ZodNumber;
            estabYoy: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            empYoy: number;
            lqValue: number;
            wageYoy: number;
            estabYoy: number;
        }, {
            empYoy: number;
            lqValue: number;
            wageYoy: number;
            estabYoy: number;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        name: string;
        naicsCode: string;
        color: string;
        lqTrend: "rising" | "stable" | "falling";
        data: {
            empYoy: number;
            lqValue: number;
            wageYoy: number;
            estabYoy: number;
        }[];
    }, {
        name: string;
        naicsCode: string;
        color: string;
        lqTrend: "rising" | "stable" | "falling";
        data: {
            empYoy: number;
            lqValue: number;
            wageYoy: number;
            estabYoy: number;
        }[];
    }>, "many">;
    weights: z.ZodObject<{
        emp: z.ZodNumber;
        lq: z.ZodNumber;
        wage: z.ZodNumber;
        estab: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        emp: number;
        lq: number;
        wage: number;
        estab: number;
    }, {
        emp: number;
        lq: number;
        wage: number;
        estab: number;
    }>;
}, "strip", z.ZodTypeAny, {
    quarters: string[];
    industries: {
        name: string;
        naicsCode: string;
        color: string;
        lqTrend: "rising" | "stable" | "falling";
        data: {
            empYoy: number;
            lqValue: number;
            wageYoy: number;
            estabYoy: number;
        }[];
    }[];
    weights: {
        emp: number;
        lq: number;
        wage: number;
        estab: number;
    };
}, {
    quarters: string[];
    industries: {
        name: string;
        naicsCode: string;
        color: string;
        lqTrend: "rising" | "stable" | "falling";
        data: {
            empYoy: number;
            lqValue: number;
            wageYoy: number;
            estabYoy: number;
        }[];
    }[];
    weights: {
        emp: number;
        lq: number;
        wage: number;
        estab: number;
    };
}>;
export type IndustryTrendScorecardConfig = z.infer<typeof industryTrendScorecardConfigSchema>;
export declare const industryTrendScorecardAiOutputSchema: z.ZodObject<{
    quarters: z.ZodArray<z.ZodString, "many">;
    industries: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        naicsCode: z.ZodString;
        color: z.ZodString;
        lqTrend: z.ZodEnum<["rising", "stable", "falling"]>;
        data: z.ZodArray<z.ZodObject<{
            empYoy: z.ZodNumber;
            lqValue: z.ZodNumber;
            wageYoy: z.ZodNumber;
            estabYoy: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            empYoy: number;
            lqValue: number;
            wageYoy: number;
            estabYoy: number;
        }, {
            empYoy: number;
            lqValue: number;
            wageYoy: number;
            estabYoy: number;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        name: string;
        naicsCode: string;
        color: string;
        lqTrend: "rising" | "stable" | "falling";
        data: {
            empYoy: number;
            lqValue: number;
            wageYoy: number;
            estabYoy: number;
        }[];
    }, {
        name: string;
        naicsCode: string;
        color: string;
        lqTrend: "rising" | "stable" | "falling";
        data: {
            empYoy: number;
            lqValue: number;
            wageYoy: number;
            estabYoy: number;
        }[];
    }>, "many">;
    weights: z.ZodObject<{
        emp: z.ZodNumber;
        lq: z.ZodNumber;
        wage: z.ZodNumber;
        estab: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        emp: number;
        lq: number;
        wage: number;
        estab: number;
    }, {
        emp: number;
        lq: number;
        wage: number;
        estab: number;
    }>;
}, "strip", z.ZodTypeAny, {
    quarters: string[];
    industries: {
        name: string;
        naicsCode: string;
        color: string;
        lqTrend: "rising" | "stable" | "falling";
        data: {
            empYoy: number;
            lqValue: number;
            wageYoy: number;
            estabYoy: number;
        }[];
    }[];
    weights: {
        emp: number;
        lq: number;
        wage: number;
        estab: number;
    };
}, {
    quarters: string[];
    industries: {
        name: string;
        naicsCode: string;
        color: string;
        lqTrend: "rising" | "stable" | "falling";
        data: {
            empYoy: number;
            lqValue: number;
            wageYoy: number;
            estabYoy: number;
        }[];
    }[];
    weights: {
        emp: number;
        lq: number;
        wage: number;
        estab: number;
    };
}>;
export type IndustryTrendScorecardAiOutput = z.infer<typeof industryTrendScorecardAiOutputSchema>;
