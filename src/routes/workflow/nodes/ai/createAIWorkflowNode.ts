import type { AIQueryData, AIMessage } from '../../types/node';
import { WorkflowNode } from '../WorkflowNode';

type AIWorkflowNodeConfig = {
	id: string;
	label: string;
	description?: string;
	prompt: string;
	systemPrompt: string;
	model?: string;
	icon?: string;
	inputLabel?: string;
	formatInputForPlaceholder?: (input: any) => string;
	formatInputForAppend?: (input: any) => string;
};

const defaultFormatInput = (input: any) => JSON.stringify(input, null, 2);

/**
 * Build messages array from AIQueryData, handling both old and new formats
 */
function buildMessages(
	queryData: AIQueryData,
	formattedUserPrompt: string
): AIMessage[] {
	// If messages are provided, use them (but replace user prompt if needed)
	if (queryData.messages && queryData.messages.length > 0) {
		// Replace the last user message with the formatted prompt if it exists
		const messages = [...queryData.messages];
		// Find last user message index (compatible with older environments)
		let lastUserIndex = -1;
		for (let i = messages.length - 1; i >= 0; i--) {
			if (messages[i].role === 'user') {
				lastUserIndex = i;
				break;
			}
		}
		if (lastUserIndex >= 0) {
			messages[lastUserIndex] = { ...messages[lastUserIndex], content: formattedUserPrompt };
		} else {
			messages.push({ role: 'user', content: formattedUserPrompt });
		}
		return messages;
	}

	// Build messages from prompt/systemPrompt (backward compatible)
	const messages: AIMessage[] = [];
	if (queryData.systemPrompt) {
		messages.push({ role: 'system', content: queryData.systemPrompt });
	}
	messages.push({ role: 'user', content: formattedUserPrompt });
	return messages;
}

/**
 * Build API request body from AIQueryData
 */
function buildAPIRequest(queryData: AIQueryData, messages: AIMessage[]): Record<string, unknown> {
	const request: Record<string, unknown> = {
		model: queryData.model,
		input: messages
	};

	// Add optional parameters if provided
	if (queryData.temperature !== undefined) request.temperature = queryData.temperature;
	if (queryData.maxTokens !== undefined) request.max_tokens = queryData.maxTokens;
	if (queryData.topP !== undefined) request.top_p = queryData.topP;
	if (queryData.frequencyPenalty !== undefined) request.frequency_penalty = queryData.frequencyPenalty;
	if (queryData.presencePenalty !== undefined) request.presence_penalty = queryData.presencePenalty;
	if (queryData.stop !== undefined) request.stop = queryData.stop;
	if (queryData.responseFormat !== undefined) request.response_format = queryData.responseFormat;
	if (queryData.functions !== undefined) request.functions = queryData.functions;
	if (queryData.tools !== undefined) request.tools = queryData.tools;
	if (queryData.stream !== undefined) request.stream = queryData.stream;
	if (queryData.user !== undefined) request.user = queryData.user;
	if (queryData.seed !== undefined) request.seed = queryData.seed;
	if (queryData.logitBias !== undefined) request.logit_bias = queryData.logitBias;

	return request;
}

export function createAIWorkflowNode(config: AIWorkflowNodeConfig): WorkflowNode {
	const {
		id,
		label,
		description,
		prompt,
		systemPrompt,
		model = 'gpt-4o',
		icon = 'AI',
		inputLabel = 'Input',
		formatInputForPlaceholder = defaultFormatInput,
		formatInputForAppend = defaultFormatInput
	} = config;

	return new WorkflowNode({
		id,
		type: 'ai',
		label,
		description,
		icon,
		defaultAIQueryData: { prompt, model, systemPrompt },
		execute: async (input: any, customData?: AIQueryData) => {
			if (!customData) {
				customData = { prompt, model, systemPrompt };
			}
			if (!customData) {
				return 'AI Query not configured';
			}

			try {
				// Format the user prompt with input data
				let formattedPrompt = customData.prompt || '';
				if (input !== null && input !== undefined) {
					if (formattedPrompt.includes('{input}')) {
						formattedPrompt = formattedPrompt.replace(
							'{input}',
							formatInputForPlaceholder(input)
						);
					} else if (formattedPrompt) {
						formattedPrompt = `${formattedPrompt}\n\n${inputLabel}: ${formatInputForAppend(input)}`;
					} else {
						// If no prompt, use input directly
						formattedPrompt = formatInputForAppend(input);
					}
				}

				// Build messages array (handles both old and new formats)
				const messages = buildMessages(customData, formattedPrompt);

				// Build API request for Vercel AI SDK
				const requestBody: Record<string, unknown> = {
					model: customData.model || 'gemini-3-flash-preview',
					messages
				};

				// Add optional parameters
				if (customData.temperature !== undefined) requestBody.temperature = customData.temperature;
				if (customData.maxTokens !== undefined) requestBody.maxTokens = customData.maxTokens;
				if (customData.topP !== undefined) requestBody.topP = customData.topP;
				if (customData.stop !== undefined) requestBody.stop = customData.stop;

				const response = await fetch('/api/ai-query', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(requestBody)
				});

				if (!response.ok) {
					const error = await response.json();
					throw new Error(error.error || 'Failed to call AI API');
				}

				const result = await response.json();
				if (result.success && result.data) {
					// Vercel AI SDK returns content directly
					if (result.data.content) return result.data.content;
					if (typeof result.data === 'string') return result.data;
					return JSON.stringify(result.data);
				}
				return 'No response';
			} catch (error) {
				console.error('AI Query error:', error);
				return `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
			}
		}
	});
}
