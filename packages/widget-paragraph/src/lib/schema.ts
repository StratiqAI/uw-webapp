import { z } from 'zod';

/**
 * Unified schema for the ParagraphWidget. This single shape is used as:
 *   - The AI model output format (what the model returns)
 *   - The EntityDefinition / JsonSchema (what gets persisted)
 *   - The VTS topic payload (what gets published)
 *   - The widget display data (what gets rendered)
 */
export const paragraphSchema = z.object({
	title: z.string().describe('Title of the paragraph'),
	description: z.string().describe('Brief description or subtitle'),
	content: z.string().describe('The main paragraph content')
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
