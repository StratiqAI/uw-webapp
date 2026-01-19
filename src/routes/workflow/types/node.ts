export type NodeType = 'input' | 'process' | 'output' | 'ai' | 'comment' | 'tools';

/**
 * AI message role types
 */
export type AIMessageRole = 'system' | 'user' | 'assistant' | 'tool';

/**
 * AI message structure for conversation history
 */
export type AIMessage = {
	role: AIMessageRole;
	content: string;
	name?: string; // For function/tool calls
	toolCallId?: string; // For tool responses
};

/**
 * Response format configuration for structured outputs
 */
export type AIResponseFormat =
	| { type: 'text' } // Default text response
	| { type: 'json_object' } // JSON object mode
	| { type: 'json_schema'; schema: Record<string, unknown> }; // JSON schema mode

/**
 * Function/tool definition for function calling
 */
export type AIFunction = {
	name: string;
	description?: string;
	parameters?: Record<string, unknown>; // JSON schema
};

/**
 * Comprehensive AI query data structure
 * Supports both simple (backward compatible) and advanced configurations
 */
export type AIQueryData = {
	// Core required fields (backward compatible)
	model: string;
	prompt: string; // User prompt (for backward compatibility)
	systemPrompt?: string; // System prompt (for backward compatibility)

	// Advanced message configuration (alternative to prompt/systemPrompt)
	// If messages are provided, they take precedence over prompt/systemPrompt
	messages?: AIMessage[]; // Full conversation history

	// Model parameters
	temperature?: number; // 0-2, controls randomness (default: 1)
	maxTokens?: number; // Maximum tokens to generate
	topP?: number; // 0-1, nucleus sampling (default: 1)
	frequencyPenalty?: number; // -2.0 to 2.0, reduces repetition (default: 0)
	presencePenalty?: number; // -2.0 to 2.0, encourages new topics (default: 0)
	stop?: string | string[]; // Stop sequences

	// Response format
	responseFormat?: AIResponseFormat; // Structured output configuration

	// Function/tool calling
	functions?: AIFunction[]; // Function definitions (legacy OpenAI format)
	tools?: Array<{
		type: 'function';
		function: AIFunction;
	}>; // Tools array (OpenAI format)

	// Advanced options
	stream?: boolean; // Enable streaming responses
	user?: string; // User ID for tracking/abuse prevention
	seed?: number; // Seed for deterministic outputs
	logitBias?: Record<string, number>; // Bias specific tokens

	// Metadata
	metadata?: Record<string, unknown>; // Custom metadata
};

// Base properties shared by all nodes
type BaseNodeProperties = {
	id: string;
	label: string;
	description?: string;
	icon: string;
};

// Input node type
export type InputNode = BaseNodeProperties & {
	type: 'input';
	execute: (input: unknown) => unknown | Promise<unknown>;
	// Input-specific properties
	defaultInput?: unknown;
};

// Process node type
export type ProcessNode = BaseNodeProperties & {
	type: 'process';
	execute: (input: unknown) => unknown | Promise<unknown>;
};

// Output node type
export type OutputNode = BaseNodeProperties & {
	type: 'output';
	execute: (input: unknown) => unknown | Promise<unknown>;
	// Output-specific properties
	outputFormat?: 'json' | 'text' | 'html' | 'pdf';
};

// AI node type
export type AINode = BaseNodeProperties & {
	type: 'ai';
	execute: (input: unknown, customData?: AIQueryData) => unknown | Promise<unknown>;
	// AI-specific properties (required)
	defaultAIQueryData: AIQueryData;
	// Optional AI-specific properties
	inputLabel?: string;
	formatInputForPlaceholder?: (input: unknown) => string;
	formatInputForAppend?: (input: unknown) => string;
};

// Comment node type (non-executable)
export type CommentNode = BaseNodeProperties & {
	type: 'comment';
	// Comments don't have execute functions
	content?: string;
};

// Tool node type (external tools/services)
export type ToolNode = BaseNodeProperties & {
	type: 'tools';
	execute: (input: unknown) => unknown | Promise<unknown>;
	// Tool-specific properties
	toolType?: string; // e.g., 'mcp', 'knowledge-base', 'api'
	defaultInput?: unknown;
};

// Discriminated union of all node types
export type WorkflowNodeType = InputNode | ProcessNode | OutputNode | AINode | CommentNode | ToolNode;

// Backward compatibility: ElementType is an alias for WorkflowNodeType
// This allows existing code to continue working
export type ElementType = WorkflowNodeType;

// Type guard functions for runtime type checking
export function isInputNode(node: ElementType): node is InputNode {
	return node.type === 'input';
}

export function isProcessNode(node: ElementType): node is ProcessNode {
	return node.type === 'process';
}

export function isOutputNode(node: ElementType): node is OutputNode {
	return node.type === 'output';
}

export function isAINode(node: ElementType): node is AINode {
	return node.type === 'ai';
}

export function isCommentNode(node: ElementType): node is CommentNode {
	return node.type === 'comment';
}

export function isToolNode(node: ElementType): node is ToolNode {
	return node.type === 'tools';
}

export function isExecutableNode(node: ElementType): node is InputNode | ProcessNode | OutputNode | AINode | ToolNode {
	return node.type !== 'comment';
}
