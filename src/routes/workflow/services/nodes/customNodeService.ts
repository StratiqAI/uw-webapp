import type { ElementType, AIQueryData, AIMessage } from '../../types/node';

const STORAGE_KEY = 'workflow-custom-ai-nodes';

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

/**
 * Load custom AI nodes from localStorage
 */
export function loadCustomAINodes(): ElementType[] {
	if (typeof window === 'undefined') {
		return [];
	}

	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored) {
			const parsed = JSON.parse(stored);
			// Restore execute functions for custom nodes
			return parsed.map((nodeData: any) => ({
				...nodeData,
				execute: createAIExecuteFunction(nodeData.defaultAIQueryData)
			}));
		}
	} catch (e) {
		console.error('Failed to load custom AI nodes:', e);
	}
	return [];
}

/**
 * Save custom AI nodes to localStorage (without execute functions)
 */
export function saveCustomAINodes(customNodes: ElementType[]): void {
	if (typeof window === 'undefined') {
		return;
	}

	try {
		// Remove execute functions before serialization
		const serializable = customNodes.map((node) => {
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			const { execute, ...rest } = node as { execute?: unknown; [key: string]: unknown };
			return rest;
		});
		localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
	} catch (e) {
		console.error('Failed to save custom AI nodes:', e);
	}
}

/**
 * Create an execute function for a custom AI node
 */
function createAIExecuteFunction(defaultAIQueryData?: AIQueryData): (input: any, customData?: AIQueryData) => Promise<any> {
	return async (input: any, customData?: AIQueryData) => {
		const queryData = customData || defaultAIQueryData;
		if (!queryData) {
			return 'AI Query not configured';
		}

		try {
			// Format the user prompt with input data
			let formattedPrompt = queryData.prompt || '';
			if (input !== null && input !== undefined) {
				if (formattedPrompt.includes('{input}')) {
					formattedPrompt = formattedPrompt.replace('{input}', JSON.stringify(input, null, 2));
				} else if (formattedPrompt) {
					formattedPrompt = `${formattedPrompt}\n\nInput: ${JSON.stringify(input, null, 2)}`;
				} else {
					// If no prompt, use input directly
					formattedPrompt = JSON.stringify(input, null, 2);
				}
			}

			// Build messages array (handles both old and new formats)
			const messages = buildMessages(queryData, formattedPrompt);

			// Build API request with all parameters
			const requestBody = buildAPIRequest(queryData, messages);

			const response = await fetch('/api/openai-responses', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(requestBody)
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Failed to call OpenAI API');
			}

			const result = await response.json();
			if (result.data) {
				if (result.data.output && Array.isArray(result.data.output)) {
					const firstOutput = result.data.output[0];
					if (firstOutput?.content) return firstOutput.content;
					if (typeof firstOutput === 'string') return firstOutput;
				}
				if (result.data.content) return result.data.content;
				if (typeof result.data === 'string') return result.data;
				return JSON.stringify(result.data);
			}
			return 'No response';
		} catch (error) {
			console.error('AI Query error:', error);
			return `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
		}
	};
}

/**
 * Create a custom AI node element type
 */
export function createCustomAINode(
	id: string,
	label: string,
	prompt: string,
	model: string,
	systemPrompt?: string
): ElementType {
	const defaultAIQueryData: AIQueryData = {
		prompt,
		model,
		systemPrompt: systemPrompt || undefined
	};

	return {
		id,
		type: 'ai',
		label: label.trim(),
		icon: 'AI',
		defaultAIQueryData,
		execute: createAIExecuteFunction(defaultAIQueryData)
	};
}
