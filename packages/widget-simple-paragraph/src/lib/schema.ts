import { z } from 'zod';

/**
 * Schema for SimpleParagraphWidget — the AI model output format,
 * the persisted extraction result shape, and the widget display data.
 */
export const paragraphSchema = z.object({
	title: z.string().describe('A short headline for the paragraph'),
	description: z.string().describe('A one-sentence summary or subtitle'),
	content: z.string().describe('A single paragraph of plain prose text. Do not return JSON, arrays, or lists — only human-readable narrative text.')
});

export type ParagraphData = z.infer<typeof paragraphSchema>;
