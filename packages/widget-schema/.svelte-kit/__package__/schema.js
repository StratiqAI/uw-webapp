import { z } from 'zod';
export const schemaWidgetDataSchema = z.object({
    schemaId: z.string(),
    data: z.unknown().optional()
});
