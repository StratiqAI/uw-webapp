/**
 * Shared types for AI Studio requests.
 * Client-safe — no server-only imports.
 */

import type { UIMessage } from 'ai';

// ---------------------------------------------------------------------------
// Tool-level configuration
// ---------------------------------------------------------------------------

export interface AiStudioFunctionDeclaration {
	name: string;
	description?: string;
	/** JSON Schema object describing the function parameters. */
	parameters?: Record<string, unknown>;
}

export interface AiStudioFunctionCallingConfig {
	declarations: AiStudioFunctionDeclaration[];
}

/**
 * Which Gemini tools are enabled for a generation request.
 * Each key maps to a Vertex AI `Tool` entry.
 */
export interface AiStudioToolsConfig {
	googleSearch?: boolean;
	googleMaps?: boolean;
	urlContext?: boolean;
	codeExecution?: boolean;
	/** When true, show the workspace schema / Tools column (UI only). */
	structuredOutputs?: boolean;
	/**
	 * When false, the next run omits JSON response schema (plain text) even if a schema is configured.
	 * Omitted or true means apply schema when present. Independent of {@link structuredOutputs}.
	 */
	applyStructuredResponse?: boolean;
	functionCalling?: AiStudioFunctionCallingConfig | boolean;
}

// ---------------------------------------------------------------------------
// Structured-output override (JSON Schema sent from the client)
// ---------------------------------------------------------------------------

export interface AiStudioStructuredOutputConfig {
	/** A JSON Schema the model must conform its response to. */
	responseJsonSchema?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Full request body for POST /api/ai-studio
// ---------------------------------------------------------------------------

export interface AiStudioRequest {
	projectId: string;
	promptId: string;
	inputValues: Record<string, unknown>;
	/**
	 * When using POST /api/ai-studio with `@ai-sdk/svelte` Chat, the client sends
	 * Vercel AI `UIMessage[]` for multi-turn context.
	 */
	messages?: UIMessage[];
	systemInstruction?: string;
	documentIds?: string[];
	workspacePdfDocumentId?: string;
	topK?: number;
	topKPerNs?: number;
	priority?: string;

	/** Tool toggles — replaces the legacy `googleSearchEnabled` boolean. */
	tools?: AiStudioToolsConfig;

	/** Override or supply a JSON Schema for structured output. */
	structuredOutput?: AiStudioStructuredOutputConfig;

	// Legacy ------------------------------------------------------------------
	/** @deprecated Use `tools.googleSearch` instead. */
	googleSearchEnabled?: boolean;
}
