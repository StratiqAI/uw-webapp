import { z } from 'zod';
export const schemaWidgetDataSchema = z.object({
    schemaId: z.string(),
    data: z.unknown().optional()
});
export const schemaAiOutputSchema = z.object({
    data: z.record(z.unknown()).describe('Structured data conforming to the widget schema')
});
