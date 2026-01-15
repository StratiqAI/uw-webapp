import type { AIQueryData } from '../../types/node';
import { WorkflowNode } from '../WorkflowNode';

type AIWorkflowNodeConfig = {
	id: string;
	label: string;
	prompt: string;
	systemPrompt: string;
	model?: string;
	icon?: string;
	inputLabel?: string;
	formatInputForPlaceholder?: (input: any) => string;
	formatInputForAppend?: (input: any) => string;
};

const defaultFormatInput = (input: any) => JSON.stringify(input, null, 2);

export function createAIWorkflowNode(config: AIWorkflowNodeConfig): WorkflowNode {
	const {
		id,
		label,
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
		icon,
		execute: async (input: any, customData?: AIQueryData) => {
			if (!customData) {
				customData = { prompt, model, systemPrompt };
			}
			if (!customData) {
				return 'AI Query not configured';
			}

			try {
				let formattedPrompt = customData.prompt;
				if (input !== null && input !== undefined) {
					if (formattedPrompt.includes('{input}')) {
						formattedPrompt = formattedPrompt.replace(
							'{input}',
							formatInputForPlaceholder(input)
						);
					} else {
						formattedPrompt = `${formattedPrompt}\n\n${inputLabel}: ${formatInputForAppend(input)}`;
					}
				}

				const response = await fetch('/api/openai-responses', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						model: customData.model,
						input: [
							...(customData.systemPrompt ? [{ role: 'system', content: customData.systemPrompt }] : []),
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
		}
	});
}
