import { z } from 'zod';
export const lineChartWidgetDataSchema = z.object({
    datasets: z.array(z.object({
        label: z.string(),
        data: z.array(z.number()),
        color: z.string().nullable().optional()
    })),
    labels: z.array(z.string()),
    options: z
        .object({
        responsive: z.boolean().nullable().optional(),
        maintainAspectRatio: z.boolean().nullable().optional()
    })
        .nullable()
        .optional()
});
export const lineChartAiOutputSchema = z.object({
    labels: z.array(z.string()).describe('Labels for each data point on the x-axis'),
    datasets: z.array(z.object({
        label: z.string().describe('Name of the data series'),
        data: z.array(z.number()).describe('Numeric values for each label'),
        color: z.string().nullable().optional().describe('Hex color for the line')
    })).describe('One or more line series')
});
