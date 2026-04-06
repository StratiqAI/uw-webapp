/**
 * AI service barrel export.
 *
 * All AI functionality is available through the `aiService` facade.
 * Types are re-exported for convenience.
 */

export { aiService } from './aiService.js';

export type {
	AIMessage,
	AIMessageRole,
	AIRequestConfig,
	AIRequestOptions,
	AIResponse,
	AIToolCall,
	AIToolDefinition,
	AITokenUsage,
	AIResponseFormat,
	AIError,
	ExecutionHandle,
	SubmitExecutionInput,
	UsageContext,
	FeatureSource,
	AiQueryExecution,
	CreateAiQueryExecutionInput,
	ExecutionStatus,
	AiModel,
	GeneratePromptDraftInput,
	GeneratePromptDraftOutput,
	UsageRecord,
	UsageUnit
} from './types.js';

export { MODELS, getModelMeta, DEFAULT_BACKEND_MODEL, DEFAULT_DIRECT_MODEL } from './models.js';
export type { ModelMeta, ModelProvider } from './models.js';
