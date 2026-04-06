import { z } from 'zod';

export type UnitType = 'units' | 'sqft';

/**
 * Topic store input schema (narrow) -- what external sources publish.
 * Enough to seed the widget with property fundamentals.
 */
export const proFormaRevenueInputSchema = z.object({
	totalUnits: z.number().positive().optional(),
	totalSqFt: z.number().positive().optional(),
	marketRentPerUnit: z.number().nonnegative().optional(),
	otherIncomeAnnual: z.number().nonnegative().optional()
});

export type ProFormaRevenueInput = z.infer<typeof proFormaRevenueInputSchema>;

/**
 * Full widget config schema (broad) -- what widget.data holds.
 * Includes all property inputs plus growth rates, vacancy, and display settings.
 */
export const proFormaRevenueConfigSchema = z.object({
	unitType: z.enum(['units', 'sqft']).default('units'),
	totalUnits: z.number().nonnegative().default(0),
	totalSqFt: z.number().nonnegative().default(0),
	marketRentPerUnit: z.number().nonnegative().default(0),
	rentGrowthRate: z.number().min(0).max(1).default(0.03),
	vacancyRate: z.number().min(0).max(1).default(0.05),
	otherIncomeAnnual: z.number().nonnegative().default(0),
	otherIncomeGrowthRate: z.number().min(0).max(1).default(0.02),
	projectionYears: z.number().int().min(1).max(10).default(5),
	propertyName: z.string().optional()
});

export type ProFormaRevenueConfig = z.infer<typeof proFormaRevenueConfigSchema>;

export const proFormaRevenueAiOutputSchema = z.object({
	totalUnits: z.number().describe('Total number of units'),
	marketRentPerUnit: z.number().describe('Market rent per unit per month'),
	rentGrowthRate: z.number().describe('Annual rent growth rate (e.g. 0.03 for 3%)'),
	vacancyRate: z.number().describe('Vacancy rate (e.g. 0.05 for 5%)'),
	otherIncomeAnnual: z.number().describe('Annual other income amount'),
	projectionYears: z.number().describe('Number of projection years (1-10)')
});

export type ProFormaRevenueAiOutput = z.infer<typeof proFormaRevenueAiOutputSchema>;
