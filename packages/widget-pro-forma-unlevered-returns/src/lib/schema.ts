import { z } from 'zod';
import { proFormaUnleveredCfConfigSchema } from '@stratiqai/widget-pro-forma-unlevered-cf';

export const proFormaUnleveredReturnsInputSchema = z.object({
	egiYear1: z.number().nonnegative().optional(),
	purchasePrice: z.number().nonnegative().optional()
});

export type ProFormaUnleveredReturnsInput = z.infer<typeof proFormaUnleveredReturnsInputSchema>;

export const proFormaUnleveredReturnsConfigSchema = proFormaUnleveredCfConfigSchema.extend({
	/** Hurdle rate for NPV (unlevered). */
	unleveredDiscountRate: z.number().min(0).max(1).default(0.1)
});

export type ProFormaUnleveredReturnsConfig = z.infer<typeof proFormaUnleveredReturnsConfigSchema>;
