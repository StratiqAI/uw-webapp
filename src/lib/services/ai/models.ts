/**
 * AI model constants and metadata.
 *
 * Maps the backend AiModel enum and OpenAI model identifiers to a unified
 * registry with provider info, capabilities, and default parameters.
 */

import type { AiModel } from '@stratiqai/types-simple';

export type ModelProvider = 'google' | 'anthropic' | 'openai';

export interface ModelMeta {
	id: string;
	provider: ModelProvider;
	displayName: string;
	contextWindow: number;
	supportsVision: boolean;
	supportsStructuredOutput: boolean;
	defaultTemperature: number;
	defaultMaxTokens: number;
}

// ---------------------------------------------------------------------------
// Gemini models (backend pipeline)
// ---------------------------------------------------------------------------

const gemini = (
	id: AiModel,
	displayName: string,
	ctx: number,
	opts?: Partial<Pick<ModelMeta, 'supportsVision' | 'defaultMaxTokens'>>
): ModelMeta => ({
	id,
	provider: 'google',
	displayName,
	contextWindow: ctx,
	supportsVision: opts?.supportsVision ?? true,
	supportsStructuredOutput: true,
	defaultTemperature: 0.7,
	defaultMaxTokens: opts?.defaultMaxTokens ?? 8192
});

// ---------------------------------------------------------------------------
// Anthropic models (backend pipeline)
// ---------------------------------------------------------------------------

const anthropic = (
	id: AiModel,
	displayName: string,
	ctx: number,
	opts?: Partial<Pick<ModelMeta, 'supportsVision' | 'defaultMaxTokens'>>
): ModelMeta => ({
	id,
	provider: 'anthropic',
	displayName,
	contextWindow: ctx,
	supportsVision: opts?.supportsVision ?? true,
	supportsStructuredOutput: true,
	defaultTemperature: 0.7,
	defaultMaxTokens: opts?.defaultMaxTokens ?? 4096
});

// ---------------------------------------------------------------------------
// OpenAI models (direct API calls via /api/ai)
// ---------------------------------------------------------------------------

const openai = (
	id: string,
	displayName: string,
	ctx: number,
	opts?: Partial<Pick<ModelMeta, 'supportsVision' | 'supportsStructuredOutput' | 'defaultMaxTokens'>>
): ModelMeta => ({
	id,
	provider: 'openai',
	displayName,
	contextWindow: ctx,
	supportsVision: opts?.supportsVision ?? true,
	supportsStructuredOutput: opts?.supportsStructuredOutput ?? true,
	defaultTemperature: 0.7,
	defaultMaxTokens: opts?.defaultMaxTokens ?? 4096
});

// ---------------------------------------------------------------------------
// Model registry
// ---------------------------------------------------------------------------

export const MODELS: Record<string, ModelMeta> = {
	// Gemini
	GEMINI_2_5_FLASH: gemini('GEMINI_2_5_FLASH', 'Gemini 2.5 Flash', 1_048_576),
	GEMINI_2_5_FLASH_LITE: gemini('GEMINI_2_5_FLASH_LITE', 'Gemini 2.5 Flash Lite', 1_048_576),
	GEMINI_2_5_PRO: gemini('GEMINI_2_5_PRO', 'Gemini 2.5 Pro', 1_048_576, { defaultMaxTokens: 16384 }),
	GEMINI_3_FLASH_PREVIEW: gemini('GEMINI_3_FLASH_PREVIEW', 'Gemini 3 Flash (Preview)', 1_048_576),
	GEMINI_3_PRO_PREVIEW: gemini('GEMINI_3_PRO_PREVIEW', 'Gemini 3 Pro (Preview)', 1_048_576, { defaultMaxTokens: 16384 }),
	GEMINI_3_1_FLASH_PREVIEW: gemini('GEMINI_3_1_FLASH_PREVIEW', 'Gemini 3.1 Flash (Preview)', 1_048_576),
	GEMINI_3_1_PRO_PREVIEW: gemini('GEMINI_3_1_PRO_PREVIEW', 'Gemini 3.1 Pro (Preview)', 1_048_576, { defaultMaxTokens: 16384 }),

	// Anthropic
	CLAUDE_3_HAIKU_20240307: anthropic('CLAUDE_3_HAIKU_20240307', 'Claude 3 Haiku', 200_000),
	CLAUDE_3_5_HAIKU_20241022: anthropic('CLAUDE_3_5_HAIKU_20241022', 'Claude 3.5 Haiku', 200_000),
	CLAUDE_3_5_SONNET_20241022: anthropic('CLAUDE_3_5_SONNET_20241022', 'Claude 3.5 Sonnet', 200_000),
	CLAUDE_3_OPUS_20240229: anthropic('CLAUDE_3_OPUS_20240229', 'Claude 3 Opus', 200_000),
	CLAUDE_HAIKU_4_5: anthropic('CLAUDE_HAIKU_4_5', 'Claude 4.5 Haiku', 200_000),
	CLAUDE_HAIKU_4_5_20251001: anthropic('CLAUDE_HAIKU_4_5_20251001', 'Claude 4.5 Haiku (Oct 2025)', 200_000),
	CLAUDE_SONNET_4_5: anthropic('CLAUDE_SONNET_4_5', 'Claude 4.5 Sonnet', 200_000),
	CLAUDE_SONNET_4_5_20250929: anthropic('CLAUDE_SONNET_4_5_20250929', 'Claude 4.5 Sonnet (Sep 2025)', 200_000),
	CLAUDE_SONNET_4_6: anthropic('CLAUDE_SONNET_4_6', 'Claude 4.6 Sonnet', 200_000),
	CLAUDE_SONNET_4_20250514: anthropic('CLAUDE_SONNET_4_20250514', 'Claude 4 Sonnet (May 2025)', 200_000),
	CLAUDE_OPUS_4_5: anthropic('CLAUDE_OPUS_4_5', 'Claude 4.5 Opus', 200_000, { defaultMaxTokens: 8192 }),
	CLAUDE_OPUS_4_5_20251101: anthropic('CLAUDE_OPUS_4_5_20251101', 'Claude 4.5 Opus (Nov 2025)', 200_000, { defaultMaxTokens: 8192 }),
	CLAUDE_OPUS_4_6: anthropic('CLAUDE_OPUS_4_6', 'Claude 4.6 Opus', 200_000, { defaultMaxTokens: 8192 }),
	CLAUDE_OPUS_4_1_20250805: anthropic('CLAUDE_OPUS_4_1_20250805', 'Claude 4.1 Opus (Aug 2025)', 200_000, { defaultMaxTokens: 8192 }),
	CLAUDE_OPUS_4_20250514: anthropic('CLAUDE_OPUS_4_20250514', 'Claude 4 Opus (May 2025)', 200_000, { defaultMaxTokens: 8192 }),

	// OpenAI (direct API)
	'gpt-4o': openai('gpt-4o', 'GPT-4o', 128_000),
	'gpt-4o-mini': openai('gpt-4o-mini', 'GPT-4o Mini', 128_000),
	'gpt-4.1': openai('gpt-4.1', 'GPT-4.1', 1_047_576),
	'gpt-4.1-mini': openai('gpt-4.1-mini', 'GPT-4.1 Mini', 1_047_576),
	'gpt-4.1-nano': openai('gpt-4.1-nano', 'GPT-4.1 Nano', 1_047_576),
	'o3-mini': openai('o3-mini', 'o3 Mini', 200_000, { supportsVision: false })
} as const;

export const DEFAULT_BACKEND_MODEL: AiModel = 'GEMINI_2_5_FLASH';
export const DEFAULT_DIRECT_MODEL = 'gpt-4o';

export function getModelMeta(modelId: string): ModelMeta | undefined {
	return MODELS[modelId];
}
