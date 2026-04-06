import { z } from 'zod';

export const econBaseIndustrySchema = z.object({
	name: z.string().min(1),
	naicsCode: z.string().min(1),
	localEmp: z.number().nonnegative(),
	nationalEmp: z.number().nonnegative()
});

export type EconBaseIndustry = z.infer<typeof econBaseIndustrySchema>;

export const econBaseMultiplierConfigSchema = z.object({
	regionLabel: z.string().optional(),
	industries: z.array(econBaseIndustrySchema).min(0)
});

export type EconBaseMultiplierConfig = z.infer<typeof econBaseMultiplierConfigSchema>;

export const econBaseMultiplierAiOutputSchema = z.object({
	regionLabel: z.string().optional().describe('Name of the region being analyzed'),
	industries: z.array(z.object({
		name: z.string().describe('Industry name'),
		naicsCode: z.string().describe('NAICS industry code'),
		localEmp: z.number().describe('Local employment count'),
		nationalEmp: z.number().describe('National employment count')
	})).describe('Array of industries with employment data')
});

export type EconBaseMultiplierAiOutput = z.infer<typeof econBaseMultiplierAiOutputSchema>;
