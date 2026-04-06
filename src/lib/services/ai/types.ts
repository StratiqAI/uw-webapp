/**
 * Unified AI type definitions.
 *
 * Re-exports canonical backend types from @stratiqai/types-simple and defines
 * webapp-specific AI interfaces used across the service layer.
 */

import type { Readable } from 'svelte/store';

// Re-export backend types consumers need
export type {
	AiQueryExecution,
	CreateAiQueryExecutionInput,
	ExecutionStatus,
	AiModel,
	GeneratePromptDraftInput,
	GeneratePromptDraftOutput,
	UsageRecord,
	UsageUnit,
	CreateUsageRecordInput
} from '@stratiqai/types-simple';

// ---------------------------------------------------------------------------
// Message types
// ---------------------------------------------------------------------------

export type AIMessageRole = 'system' | 'user' | 'assistant' | 'tool';

export interface AIMessage {
	role: AIMessageRole;
	content: string;
	name?: string;
	toolCallId?: string;
}

// ---------------------------------------------------------------------------
// Request configuration
// ---------------------------------------------------------------------------

export interface AIRequestConfig {
	model: string;
	messages: AIMessage[];
	temperature?: number;
	maxTokens?: number;
	topP?: number;
	frequencyPenalty?: number;
	tools?: AIToolDefinition[];
	responseFormat?: AIResponseFormat;
}

export interface AIToolDefinition {
	type: 'function';
	name: string;
	description: string;
	parameters: Record<string, unknown>;
	strict?: boolean;
}

export interface AIResponseFormat {
	type: 'text' | 'json_schema';
	schema?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Request options
// ---------------------------------------------------------------------------

export interface AIRequestOptions {
	timeout?: number;
	retries?: number;
	priority?: 'HIGH' | 'MEDIUM' | 'LOW';
	signal?: AbortSignal;
}

// ---------------------------------------------------------------------------
// Response types
// ---------------------------------------------------------------------------

export interface AIResponse {
	content: string;
	toolCalls?: AIToolCall[];
	usage?: AITokenUsage;
	raw?: unknown;
}

export interface AIToolCall {
	id: string;
	name: string;
	arguments: string;
}

export interface AITokenUsage {
	promptTokens: number;
	completionTokens: number;
	totalTokens: number;
}

// ---------------------------------------------------------------------------
// Error types
// ---------------------------------------------------------------------------

export class AIError extends Error {
	readonly code: string;
	readonly status?: number;
	readonly retryable: boolean;

	constructor(
		message: string,
		code: string,
		opts?: { status?: number; retryable?: boolean; cause?: unknown }
	) {
		super(message, { cause: opts?.cause });
		this.name = 'AIError';
		this.code = code;
		this.status = opts?.status;
		this.retryable = opts?.retryable ?? false;
	}
}

// ---------------------------------------------------------------------------
// Execution handle (reactive wrapper for AppSync execution flow)
// ---------------------------------------------------------------------------

export interface ExecutionHandle {
	/** Reactive store of the latest execution snapshot */
	execution: Readable<import('@stratiqai/types-simple').AiQueryExecution | null>;
	/** Reactive store of the current status */
	status: Readable<import('@stratiqai/types-simple').ExecutionStatus | null>;
	/** Resolves with rawOutput on SUCCESS, null on ERROR/CANCELLED */
	result: Promise<string | null>;
	/** Request cancellation of the execution */
	cancel: () => void;
	/** Tear down subscription and clean up resources */
	destroy: () => void;
}

// ---------------------------------------------------------------------------
// Execution submission input (webapp-friendly shape)
// ---------------------------------------------------------------------------

export interface SubmitExecutionInput {
	projectId: string;
	promptId: string;
	inputValues: Record<string, unknown>;
	executionId?: string;
	documentIds?: string[];
	topK?: number;
	priority?: 'HIGH' | 'MEDIUM' | 'LOW';
}

// ---------------------------------------------------------------------------
// Usage context for billing
// ---------------------------------------------------------------------------

export type FeatureSource =
	| 'widget'
	| 'chat'
	| 'prompt-editor'
	| 'document-analysis';

export interface UsageContext {
	tenantId: string;
	ownerId: string;
	projectId?: string;
	featureSource: FeatureSource;
}
