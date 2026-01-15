import { createAIWorkflowNode } from './createAIWorkflowNode';

export const riskAssessmentNode = createAIWorkflowNode({
	id: 'ai-risk-assessment',
	label: 'Risk Assessment',
	description: 'Assess investment risks including financial, market, and regulatory factors',
	prompt:
		'Assess the investment risks for this commercial real estate opportunity. Consider financial, market, property, and regulatory risks: {input}',
	systemPrompt:
		'You are a commercial real estate risk analyst expert in identifying and evaluating investment risks including market volatility, property condition, tenant risk, and regulatory compliance.',
	inputLabel: 'Investment Data'
});
