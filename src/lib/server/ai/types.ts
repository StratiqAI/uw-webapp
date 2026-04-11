/**
 * Types for SvelteKit server-side AI streaming (vision RAG + text template).
 */

import type { GoogleGenAI } from '@google/genai';
import type { Prompt } from '@stratiqai/types-simple';

/** HTTP POST body for /api/ai-stream */
export interface StreamRequestBody {
	projectId: string;
	promptId: string;
	executionId?: string;
	inputValues: Record<string, unknown>;
	documentIds?: string[];
	topK?: number;
	topKPerNs?: number;
	priority?: string;
	/** When false, disables Gemini Google Search grounding (default true). */
	googleSearchEnabled?: boolean;
}

export interface VisionRagConfig {
	projectId: string;
	location: string;
	pineconeApiKey: string;
	pineconeIndexName: string;
}

export interface VisionRagBlock {
	question: string;
	documentIds: string[];
	visionConfig: VisionRagConfig;
	topK: number;
	topKPerNs: number;
	googleSearchEnabled?: boolean;
}

export interface LoadedImage {
	base64: string;
	mimeType: string;
	filename: string;
}

export interface ResolvedStreamQuery {
	client: GoogleGenAI;
	modelId: string;
	schemaDefinition: Record<string, unknown> | null;
	variables: Record<string, unknown>;
	visionRag: VisionRagBlock | null;
	promptText: string;
	prompt: Pick<Prompt, 'prompt' | 'inputVariables' | 'model' | 'jsonSchemaId'>;
}

export type ResolveStreamResult =
	| { kind: 'resolved'; data: ResolvedStreamQuery }
	| { kind: 'error'; errorCode: string; errorMessage: string };

export interface StreamChunk {
	type: 'chunk' | 'meta' | 'done' | 'error';
	text?: string;
	message?: string;
	errorCode?: string;
	promptTokenCount?: number;
	candidatesTokenCount?: number;
	executionId?: string;
}
