import { z } from 'zod';
import { proFormaLeveredCfConfigSchema, proFormaLeveredCfInputSchema } from '@stratiqai/widget-pro-forma-levered-cf';
export const proFormaLeveredReturnsInputSchema = proFormaLeveredCfInputSchema;
export const proFormaLeveredReturnsConfigSchema = proFormaLeveredCfConfigSchema.extend({
    /** Hurdle rate for levered NPV (often higher than unlevered). */
    leveredDiscountRate: z.number().min(0).max(1).default(0.12)
});
