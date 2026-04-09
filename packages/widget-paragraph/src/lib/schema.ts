import { z } from 'zod';

/**
 * Unified schema for the ParagraphWidget. This single shape is used as:
 *   - The AI model output format (what the model returns)
 *   - The EntityDefinition / JsonSchema (what gets persisted)
 *   - The VTS topic payload (what gets published)
 *   - The widget display data (what gets rendered)
 */
export const paragraphSchema = z.object({
	title: z.string().describe('A short headline for the paragraph'),
	description: z.string().describe('A one-sentence summary or subtitle'),
	content: z.string().describe('A single paragraph of plain prose text. Do not return JSON, arrays, or lists — only human-readable narrative text.')
});

export type ParagraphData = z.infer<typeof paragraphSchema>;

/** @deprecated Use `paragraphSchema` instead. Alias kept for backward compatibility. */
export const paragraphWidgetDataSchema = paragraphSchema;
/** @deprecated Use `ParagraphData` instead. */
export type ParagraphWidgetData = ParagraphData;
/** @deprecated Use `paragraphSchema` instead. The AI output shape is now identical to the display shape. */
export const paragraphAiOutputSchema = paragraphSchema;
/** @deprecated Use `ParagraphData` instead. */
export type ParagraphAiOutput = ParagraphData;
