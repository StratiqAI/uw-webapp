import { createAIWorkflowNode } from './createAIWorkflowNode';

/**
 * Generic AI Query Node that allows users to input their own AI query.
 * Users can configure the prompt, system prompt, model, and other AI parameters
 * through the workflow editor UI.
 */
export const aiQueryNode = createAIWorkflowNode({
	id: 'ai-query',
	label: 'AI Query',
	description: 'Execute a custom AI query. Configure the prompt, system prompt, model, and other parameters.',
	prompt: '{input}',
	systemPrompt: 'You are a helpful AI assistant.',
	model: 'gemini-3-flash-preview',
	icon: 'AI',
	inputLabel: 'Input'
});
