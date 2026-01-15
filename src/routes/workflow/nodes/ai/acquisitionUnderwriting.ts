import { createAIWorkflowNode } from './createAIWorkflowNode';

export const acquisitionUnderwritingNode = createAIWorkflowNode({
	id: 'ai-acquisition-underwriting',
	label: 'Acquisition Underwriting',
	description: 'Perform comprehensive acquisition underwriting',
	prompt:
		'Perform comprehensive acquisition underwriting for this commercial property investment. Analyze purchase price, projected returns, risks, and investment viability: {input}',
	systemPrompt:
		'You are a commercial real estate underwriter expert in acquisition analysis, investment underwriting, and deal evaluation.',
	inputLabel: 'Acquisition Data'
});
