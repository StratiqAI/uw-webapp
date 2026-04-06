import { z } from 'zod';
export const heatmapWidgetDataSchema = z.object({
    rows: z.array(z.string()),
    cols: z.array(z.string()),
    values: z.array(z.array(z.number()))
});
