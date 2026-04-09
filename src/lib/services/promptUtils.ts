/**
 * Shared prompt utility types and functions.
 *
 * Extracted from PromptService so they can be used across routes
 * (prompt library, ontology explorer, etc.) without circular deps.
 */

import type { Prompt } from '@stratiqai/types-simple';

export interface AIQueryData {
	prompt: string;
	model: string;
	systemPrompt?: string;
	temperature?: number;
	maxTokens?: number;
	topP?: number;
	frequencyPenalty?: number;
	presencePenalty?: number;
	stop?: string | string[];
	responseFormat?: {
		type: 'text' | 'json_object' | 'json_schema';
		schema?: Record<string, any>;
	};
	stream?: boolean;
	user?: string;
	seed?: number;
	logitBias?: Record<string, number>;
	metadata?: Record<string, any>;
}

/**
 * Get a string from a Prompt suitable for the editor (parseable by parseTemplateToAIQueryData).
 */
export function getTemplateStrForEditor(prompt: Prompt): string {
	const body = prompt.prompt ?? '';
	const systemInstruction = prompt.systemInstruction ?? '';
	const model = prompt.model ?? 'GEMINI_2_5_FLASH';
	return serializeAIQueryDataToTemplate({ prompt: body, systemPrompt: systemInstruction, model });
}

/**
 * Parse the template JSON string to AIQueryData.
 */
export function parseTemplateToAIQueryData(template: string): AIQueryData {
	try {
		const parsed = JSON.parse(template);
		return {
			prompt: parsed.prompt || '',
			model: parsed.model || 'GEMINI_2_5_FLASH',
			systemPrompt: parsed.systemPrompt,
			temperature: parsed.temperature,
			maxTokens: parsed.maxTokens,
			topP: parsed.topP,
			frequencyPenalty: parsed.frequencyPenalty,
			presencePenalty: parsed.presencePenalty,
			stop: parsed.stop,
			responseFormat: parsed.responseFormat,
			stream: parsed.stream,
			user: parsed.user,
			seed: parsed.seed,
			logitBias: parsed.logitBias,
			metadata: parsed.metadata
		};
	} catch {
		return {
			prompt: template || '',
			model: 'GEMINI_2_5_FLASH'
		};
	}
}

/**
 * Serialize AIQueryData to JSON string for storage.
 */
export function serializeAIQueryDataToTemplate(data: AIQueryData): string {
	const cleanData: Record<string, any> = {
		prompt: data.prompt,
		model: data.model
	};

	if (data.systemPrompt) cleanData.systemPrompt = data.systemPrompt;
	if (data.temperature !== undefined) cleanData.temperature = data.temperature;
	if (data.maxTokens !== undefined) cleanData.maxTokens = data.maxTokens;
	if (data.topP !== undefined) cleanData.topP = data.topP;
	if (data.frequencyPenalty !== undefined) cleanData.frequencyPenalty = data.frequencyPenalty;
	if (data.presencePenalty !== undefined) cleanData.presencePenalty = data.presencePenalty;
	if (data.stop) cleanData.stop = data.stop;
	if (data.responseFormat) cleanData.responseFormat = data.responseFormat;
	if (data.stream) cleanData.stream = data.stream;
	if (data.user) cleanData.user = data.user;
	if (data.seed !== undefined) cleanData.seed = data.seed;
	if (data.logitBias) cleanData.logitBias = data.logitBias;
	if (data.metadata) cleanData.metadata = data.metadata;

	return JSON.stringify(cleanData);
}

/**
 * Extract unique variable names from prompt text in order of first occurrence.
 * Supports {{name}} and {name} (single-brace) placeholders.
 */
export function extractPromptVariableNames(text: string): string[] {
	if (!text?.trim()) return [];
	const seen = new Set<string>();
	const result: string[] = [];
	const doubleRegex = /\{\{([^}]+)\}\}/g;
	const singleRegex = /\{([^{}]+)\}/g;
	let m: RegExpExecArray | null;
	while ((m = doubleRegex.exec(text)) !== null) {
		const name = m[1].trim();
		if (name && !seen.has(name)) {
			seen.add(name);
			result.push(name);
		}
	}
	while ((m = singleRegex.exec(text)) !== null) {
		const name = m[1].trim();
		if (name && !seen.has(name)) {
			seen.add(name);
			result.push(name);
		}
	}
	return result;
}
