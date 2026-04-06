/**
 * Prompt AI Client — wraps the generatePromptDraft GraphQL mutation.
 *
 * Provides a clean async function for prompt generation via the AppSync backend
 * (which runs the promptGenerate Lambda with Gemini).
 */

import { M_GENERATE_PROMPT_DRAFT } from '@stratiqai/types-simple';
import type { GeneratePromptDraftInput, GeneratePromptDraftOutput } from '@stratiqai/types-simple';
import { gql } from '$lib/services/realtime/graphql/requestHandler';
import { AIError } from './types.js';
import { createLogger } from '$lib/utils/logger';

const log = createLogger('ai.prompt');

export interface PromptDraftResult {
	prompt: string;
	systemInstruction: string | null;
	jsonSchema: string | null;
	suggestedName: string | null;
}

/**
 * Generate a prompt draft from a plain-English description.
 *
 * Calls the `generatePromptDraft` AppSync mutation which invokes the
 * promptGenerate Lambda (Gemini-powered).
 */
export async function generatePromptDraft(
	input: GeneratePromptDraftInput,
	token: string
): Promise<PromptDraftResult> {
	if (!token) {
		throw new AIError('Authentication required', 'AUTH_REQUIRED');
	}

	if (!input.description?.trim()) {
		throw new AIError('Description cannot be empty', 'INVALID_INPUT');
	}

	log.info('Generating prompt draft', { descriptionLength: input.description.length });

	try {
		const data = await gql<{
			generatePromptDraft: GeneratePromptDraftOutput | null;
		}>(M_GENERATE_PROMPT_DRAFT, { input }, token);

		const draft = data?.generatePromptDraft;
		if (!draft) {
			throw new AIError('No result returned from AI', 'EMPTY_RESPONSE');
		}

		return {
			prompt: draft.prompt,
			systemInstruction: draft.systemInstruction ?? null,
			jsonSchema: draft.jsonSchema ?? null,
			suggestedName: draft.suggestedName ?? null
		};
	} catch (err) {
		if (err instanceof AIError) throw err;
		log.error('generatePromptDraft failed:', err);
		throw new AIError(
			err instanceof Error ? err.message : 'Prompt generation failed',
			'GENERATION_FAILED',
			{ cause: err }
		);
	}
}
