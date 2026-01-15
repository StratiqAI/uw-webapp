import { createAIWorkflowNode } from './createAIWorkflowNode';

export const investmentRecommendationNode = createAIWorkflowNode({
	id: 'ai-investment-recommendation',
	label: 'Investment Recommendation',
	prompt:
		'Provide an investment recommendation for this commercial real estate opportunity. Include buy/hold/pass recommendation with rationale: {input}',
	systemPrompt:
		'You are a senior commercial real estate investment advisor with expertise in underwriting deals, analyzing returns, and making investment recommendations for institutional and private investors.',
	inputLabel: 'Investment Analysis'
});
