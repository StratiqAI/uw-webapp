/**
 * AI Service Facade — single public entry point for all AI interactions.
 *
 * Consumer code should import from this module (or the barrel `index.ts`)
 * rather than reaching into individual client files.
 */

import { submitExecution, submitStreamingExecution, calculateExecutionId } from './executionClient.js';
import { queryAI } from './directAiClient.js';
import { generatePromptDraft } from './promptAiClient.js';
import { buildMessages, buildRequestBody } from './messageBuilder.js';
import { parseDirectResponse, parseExecutionOutput } from './responseParser.js';
import { MODELS, getModelMeta, DEFAULT_BACKEND_MODEL, DEFAULT_DIRECT_MODEL } from './models.js';

export const aiService = {
	// AppSync execution pipeline (widgets, AI studio)
	submitExecution,
	submitStreamingExecution,
	calculateExecutionId,

	// Direct AI calls (chat, future features)
	query: queryAI,

	// Prompt generation (AI-assisted prompt drafting)
	generateDraft: generatePromptDraft,

	// Shared utilities
	buildMessages,
	buildRequestBody,
	parseDirectResponse,
	parseExecutionOutput,

	// Model registry
	models: MODELS,
	getModelMeta,
	DEFAULT_BACKEND_MODEL,
	DEFAULT_DIRECT_MODEL
};
