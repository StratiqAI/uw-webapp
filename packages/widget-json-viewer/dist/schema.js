import { z } from 'zod';
export const jsonViewerWidgetDataSchema = z.object({
    title: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    json: z.unknown()
});
