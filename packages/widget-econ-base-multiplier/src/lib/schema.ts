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
