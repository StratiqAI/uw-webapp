import { z } from 'zod';
export declare const econBaseIndustrySchema: z.ZodObject<{
    name: z.ZodString;
    naicsCode: z.ZodString;
    localEmp: z.ZodNumber;
    nationalEmp: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    name: string;
    naicsCode: string;
    localEmp: number;
    nationalEmp: number;
}, {
    name: string;
    naicsCode: string;
    localEmp: number;
    nationalEmp: number;
}>;
export type EconBaseIndustry = z.infer<typeof econBaseIndustrySchema>;
export declare const econBaseMultiplierConfigSchema: z.ZodObject<{
    regionLabel: z.ZodOptional<z.ZodString>;
    industries: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        naicsCode: z.ZodString;
        localEmp: z.ZodNumber;
        nationalEmp: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        name: string;
        naicsCode: string;
        localEmp: number;
        nationalEmp: number;
    }, {
        name: string;
        naicsCode: string;
        localEmp: number;
        nationalEmp: number;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    industries: {
        name: string;
        naicsCode: string;
        localEmp: number;
        nationalEmp: number;
    }[];
    regionLabel?: string | undefined;
}, {
    industries: {
        name: string;
        naicsCode: string;
        localEmp: number;
        nationalEmp: number;
    }[];
    regionLabel?: string | undefined;
}>;
export type EconBaseMultiplierConfig = z.infer<typeof econBaseMultiplierConfigSchema>;
