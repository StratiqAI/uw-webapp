import { z } from 'zod';
const customExpenseRowSchema = z.object({
    label: z.string().min(1),
    baseAmount: z.number().nonnegative(),
    growthRate: z.number().min(0).max(1).default(0.03)
});
/**
 * Topic store input schema (narrow) — what external sources can publish.
 * Allows injecting EGI values and property size from the revenue widget.
 */
export const proFormaOpExInputSchema = z.object({
    egiYear1: z.number().nonnegative().optional(),
    totalUnits: z.number().positive().optional(),
    totalSqFt: z.number().positive().optional()
});
/**
 * Full widget config schema (broad) — what widget.data holds.
 */
export const proFormaOpExConfigSchema = z.object({
    unitType: z.enum(['units', 'sqft']).default('units'),
    totalUnits: z.number().nonnegative().default(0),
    totalSqFt: z.number().nonnegative().default(0),
    egiYear1: z.number().nonnegative().default(0),
    egiGrowthRate: z.number().min(0).max(1).default(0.03),
    baseOperatingExpenses: z.number().nonnegative().default(0),
    expenseGrowthRate: z.number().min(0).max(1).default(0.03),
    managementFeeRate: z.number().min(0).max(1).default(0.04),
    reservePerUnit: z.number().nonnegative().default(250),
    applyGrowthToReserves: z.boolean().default(false),
    customExpenses: z.array(customExpenseRowSchema).default([]),
    projectionYears: z.number().int().min(1).max(10).default(5),
    propertyName: z.string().optional()
});
export const proFormaOpExAiOutputSchema = z.object({
    baseOperatingExpenses: z.number().describe('Annual base operating expenses'),
    expenseGrowthRate: z.number().describe('Annual expense growth rate (e.g. 0.03)'),
    managementFeeRate: z.number().describe('Management fee as % of EGI (e.g. 0.04)'),
    reservePerUnit: z.number().describe('Reserve per unit per year'),
    projectionYears: z.number().describe('Number of projection years (1-10)')
});
