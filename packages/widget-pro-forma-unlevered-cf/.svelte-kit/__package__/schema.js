import { z } from 'zod';
export const proFormaUnleveredCfInputSchema = z.object({
    egiYear1: z.number().nonnegative().optional(),
    totalOpexYear1: z.number().nonnegative().optional(),
    purchasePrice: z.number().nonnegative().optional()
});
export const proFormaUnleveredCfConfigSchema = z.object({
    propertyName: z.string().optional(),
    projectionYears: z.number().int().min(1).max(10).default(5),
    purchasePrice: z.number().nonnegative().default(0),
    acquisitionCosts: z.number().nonnegative().default(0),
    initialCapEx: z.number().nonnegative().default(0),
    egiYear1: z.number().nonnegative().default(0),
    egiGrowthRate: z.number().min(0).max(1).default(0.03),
    totalOpexYear1: z.number().nonnegative().default(0),
    opexGrowthRate: z.number().min(0).max(1).default(0.03),
    /** Terminal (exit) cap rate — must be positive for sale proceeds (avoids divide-by-zero). */
    terminalCapRate: z.number().min(0).max(1).default(0.055),
    costOfSalePercent: z.number().min(0).max(1).default(0.03)
});
