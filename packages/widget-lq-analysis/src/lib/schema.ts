import { z } from 'zod';

/**
 * Topic store input schema -- what external sources publish (narrow).
 * The ValidatedTopicStore validates against this shape.
 */
export const lqAnalysisInputSchema = z.object({
	city: z.string().min(1),
	state: z.string().min(1),
	zip: z.string().optional()
});

export type LqAnalysisInput = z.infer<typeof lqAnalysisInputSchema>;

/** Sort mode for the sector list (UI only; does not change the RPC). */
export type LqAnalysisSortOrder = 'lq_desc' | 'lq_asc' | 'name_asc';

/**
 * Full widget config schema -- what widget.data holds (broad).
 * Includes the topic store input fields plus RPC/display configuration.
 */
export const lqAnalysisConfigSchema = z.object({
	city: z.string().min(1),
	state: z.string().min(1),
	zip: z.string().optional(),
	/** Manual FIPS override -- when set, bypasses the city/state FIPS lookup. */
	areaFips: z.string().optional(),
	year: z.number().int().min(2025).max(2100),
	regionLabel: z.string().min(1),
	sortOrder: z.enum(['lq_desc', 'lq_asc', 'name_asc']),
	exportBaseThreshold: z.number().positive(),
	localBandLow: z.number().positive().optional(),
	localBandHigh: z.number().positive().optional()
});

export type LqAnalysisConfig = z.infer<typeof lqAnalysisConfigSchema>;
