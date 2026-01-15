import { createAIWorkflowNode } from './createAIWorkflowNode';

export const valueAddOpportunitiesNode = createAIWorkflowNode({
	id: 'ai-value-add-opportunities',
	label: 'Value-Add Opportunities',
	prompt:
		'Identify value-add opportunities for this commercial property. Analyze potential improvements, repositioning strategies, operational enhancements, and value creation initiatives: {input}',
	systemPrompt:
		'You are a commercial real estate value-add strategist expert in property repositioning, value creation, and investment value enhancement.',
	inputLabel: 'Property Data'
});
