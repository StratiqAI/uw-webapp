/**
 * Workflow Node Type Definitions and Standardized Interfaces
 * 
 * This module provides standardized interfaces for all workflow node types,
 * ensuring consistency across the workflow system.
 * 
 * ## Standardized Interfaces
 * 
 * All nodes implement `IWorkflowNodeBase` which defines common fields:
 * - `id`: Unique identifier (required)
 * - `label`: Display name (required)
 * - `description`: Optional description
 * - `icon`: Visual representation (required)
 * - `type`: Node category (required)
 * 
 * ## Node Types
 * 
 * - **IInputNode**: Receives data from external sources (events, uploads)
 * - **IProcessNode**: Performs calculations, transformations, data processing
 * - **IOutputNode**: Formats and returns final results
 * - **IAINode**: Executes AI queries with configurable prompts/models
 * - **IToolNode**: Interacts with external tools/services (MCP, APIs, etc.)
 * - **ICommentNode**: Non-executable documentation/notes
 * 
 * ## Usage
 * 
 * ```ts
 * import { IInputNode, InputNodeConfig, isValidNodeConfig } from './types/node';
 * 
 * // Create a node configuration
 * const config: InputNodeConfig = {
 *   id: 'my-input-node',
 *   type: 'input',
 *   label: 'My Input',
 *   icon: '📥',
 *   description: 'Receives input data',
 *   execute: (input) => input,
 *   defaultInput: { value: 'default' }
 * };
 * 
 * // Validate the configuration
 * if (isValidNodeConfig(config)) {
 *   // Use the config to create a node
 * }
 * ```
 * 
 * ## Backward Compatibility
 * 
 * The existing `InputNode`, `ProcessNode`, etc. types are maintained for
 * backward compatibility. New code should use the standardized interfaces
 * (`IInputNode`, `IProcessNode`, etc.) for better type safety and consistency.
 */

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

/**
 * Standardized base properties shared by all workflow nodes.
 * This interface ensures consistency across all node types.
 */
export interface IWorkflowNodeBase {
	/** Unique identifier for the node (e.g., 'on-document-upload', 'ai-query') */
	id: string;
	/** Human-readable display name for the node */
	label: string;
	/** Optional description explaining what the node does */
	description?: string;
	/** Icon identifier (emoji, string, or icon name) for visual representation */
	icon: string;
	/** Node type category */
	type: NodeType;
}

/**
 * Standardized interface for executable nodes (all except comment nodes).
 * Defines the execute function signature that all executable nodes must implement.
 */
export interface IExecutableNode extends IWorkflowNodeBase {
	/**
	 * Execute function that processes input and returns output.
	 * For AI nodes, customData may contain AIQueryData for runtime configuration.
	 */
	execute: (input: unknown, customData?: AIQueryData) => unknown | Promise<unknown>;
}

/**
 * Standardized interface for input nodes.
 * Input nodes receive data from external sources (events, uploads, etc.)
 */
export interface IInputNode extends IExecutableNode {
	type: 'input';
	/** Default input value to use when no input is provided */
	defaultInput?: unknown;
}

/**
 * Describes a required input for a process node.
 * Used in the configuration dialog to show users what data the node expects.
 */
export interface ProcessNodeRequiredInput {
	/** Property name (e.g. 'noi', 'purchasePrice') */
	name: string;
	/** Human-readable description */
	description?: string;
	/** Alternative property names the node accepts (e.g. 'netOperatingIncome' for 'noi') */
	alternateNames?: string[];
}

/**
 * Standardized interface for process nodes.
 * Process nodes perform calculations, transformations, or data processing.
 */
export interface IProcessNode extends IExecutableNode {
	type: 'process';
	/** Required inputs documented for the configuration dialog */
	requiredInputs?: ProcessNodeRequiredInput[];
	/** Human-readable formula or summary of the processing logic (e.g. "NOI / Price × 100%") */
	formula?: string;
}

/**
 * Standardized interface for output nodes.
 * Output nodes format and return final results.
 */
export interface IOutputNode extends IExecutableNode {
	type: 'output';
	/** Format for the output (json, text, html, pdf) */
	outputFormat?: 'json' | 'text' | 'html' | 'pdf';
}

/**
 * Standardized interface for AI nodes.
 * AI nodes execute AI queries with configurable prompts and models.
 */
export interface IAINode extends IExecutableNode {
	type: 'ai';
	/** Default AI query configuration (required for AI nodes) */
	defaultAIQueryData: AIQueryData;
	/** Label for the input field in the UI */
	inputLabel?: string;
	/** Function to format input for placeholder text */
	formatInputForPlaceholder?: (input: unknown) => string;
	/** Function to format input when appending to prompt */
	formatInputForAppend?: (input: unknown) => string;
}

/**
 * Standardized interface for tool nodes.
 * Tool nodes interact with external tools/services (MCP, knowledge bases, APIs, etc.)
 */
export interface IToolNode extends IExecutableNode {
	type: 'tools';
	/** Type of tool (e.g., 'mcp', 'knowledge-base', 'api') */
	toolType?: string;
	/** Default input value for the tool */
	defaultInput?: unknown;
}

/**
 * Standardized interface for comment nodes.
 * Comment nodes are non-executable and used for documentation/notes.
 */
export interface ICommentNode extends IWorkflowNodeBase {
	type: 'comment';
	/** Optional text content for the comment */
	content?: string;
}

/**
 * Union type of all standardized node interfaces.
 * Use this for type checking and ensuring node consistency.
 */
export type StandardizedWorkflowNode = IInputNode | IProcessNode | IOutputNode | IAINode | IToolNode | ICommentNode;

/**
 * Configuration types for creating nodes.
 * These types define the required and optional fields when instantiating nodes.
 */

/** Configuration for creating an input node */
export interface InputNodeConfig extends Omit<IInputNode, 'execute'> {
	type: 'input';
	execute: (input: unknown) => unknown | Promise<unknown>;
}

/** Configuration for creating a process node */
export interface ProcessNodeConfig extends Omit<IProcessNode, 'execute'> {
	type: 'process';
	execute: (input: unknown) => unknown | Promise<unknown>;
}

/** Configuration for creating an output node */
export interface OutputNodeConfig extends Omit<IOutputNode, 'execute'> {
	type: 'output';
	execute: (input: unknown) => unknown | Promise<unknown>;
}

/** Configuration for creating an AI node */
export interface AINodeConfig extends Omit<IAINode, 'execute' | 'defaultAIQueryData'> {
	type: 'ai';
	execute: (input: unknown, customData?: AIQueryData) => unknown | Promise<unknown>;
	defaultAIQueryData: AIQueryData;
}

/** Configuration for creating a tool node */
export interface ToolNodeConfig extends Omit<IToolNode, 'execute'> {
	type: 'tools';
	execute: (input: unknown) => unknown | Promise<unknown>;
}

/** Configuration for creating a comment node */
export interface CommentNodeConfig extends ICommentNode {
	type: 'comment';
}

/**
 * Union type of all node configuration types.
 * Use this when creating new nodes to ensure all required fields are provided.
 */
export type WorkflowNodeConfig = 
	| InputNodeConfig 
	| ProcessNodeConfig 
	| OutputNodeConfig 
	| AINodeConfig 
	| ToolNodeConfig 
	| CommentNodeConfig;

// Base properties shared by all nodes (backward compatibility)
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
	requiredInputs?: ProcessNodeRequiredInput[];
	formula?: string;
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

/**
 * Validates that a node conforms to the standardized interface.
 * Checks that all required base fields are present.
 * 
 * @param node - The node to validate
 * @returns true if the node has all required base fields, false otherwise
 * 
 * @example
 * ```ts
 * const node = { id: 'test', label: 'Test', icon: '🔧', type: 'process' };
 * if (isValidWorkflowNode(node)) {
 *   // Node has all required fields
 * }
 * ```
 */
export function isValidWorkflowNode(node: unknown): node is IWorkflowNodeBase {
	if (!node || typeof node !== 'object') {
		return false;
	}
	
	const n = node as Record<string, unknown>;
	
	// Check required base fields
	return (
		typeof n.id === 'string' &&
		typeof n.label === 'string' &&
		typeof n.icon === 'string' &&
		typeof n.type === 'string' &&
		['input', 'process', 'output', 'ai', 'comment', 'tools'].includes(n.type as string)
	);
}

/**
 * Validates that a node configuration is complete and valid.
 * More strict than isValidWorkflowNode - checks type-specific requirements.
 * 
 * @param config - The node configuration to validate
 * @returns true if the configuration is valid, false otherwise
 */
export function isValidNodeConfig(config: unknown): config is WorkflowNodeConfig {
	if (!isValidWorkflowNode(config)) {
		return false;
	}
	
	const c = config as WorkflowNodeConfig;
	
	// Type-specific validation
	switch (c.type) {
		case 'input':
		case 'process':
		case 'output':
		case 'tools':
			return typeof c.execute === 'function';
		
		case 'ai':
			return (
				typeof c.execute === 'function' &&
				c.defaultAIQueryData !== undefined &&
				typeof c.defaultAIQueryData === 'object' &&
				c.defaultAIQueryData !== null &&
				'model' in c.defaultAIQueryData &&
				'prompt' in c.defaultAIQueryData
			);
		
		case 'comment':
			// Comments don't need execute functions
			return true;
		
		default:
			return false;
	}
}
