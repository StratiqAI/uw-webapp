import type { ElementType, AIQueryData } from '../../types/node';

const STORAGE_KEY = 'workflow-custom-ai-nodes';

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
		const serializable = customNodes.map(({ execute, ...rest }) => rest);
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
			let formattedPrompt = queryData.prompt;
			if (input !== null && input !== undefined) {
				if (formattedPrompt.includes('{input}')) {
					formattedPrompt = formattedPrompt.replace('{input}', JSON.stringify(input, null, 2));
				} else {
					formattedPrompt = `${formattedPrompt}\n\nInput: ${JSON.stringify(input, null, 2)}`;
				}
			}

			const response = await fetch('/api/openai-responses', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					model: queryData.model,
					input: [
						...(queryData.systemPrompt ? [{ role: 'system', content: queryData.systemPrompt }] : []),
						{ role: 'user', content: formattedPrompt }
					]
				})
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
