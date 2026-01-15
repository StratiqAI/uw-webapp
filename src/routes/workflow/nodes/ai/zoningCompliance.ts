import { createAIWorkflowNode } from './createAIWorkflowNode';

export const zoningComplianceNode = createAIWorkflowNode({
	id: 'ai-zoning-compliance',
	label: 'Zoning Compliance',
	description: 'Assess zoning regulations, permitted uses, and development rights',
	prompt:
		'Analyze zoning regulations and compliance for this commercial property. Assess permitted uses, development rights, setbacks, parking requirements, and potential zoning risks or opportunities: {input}',
	systemPrompt:
		'You are a commercial real estate zoning expert specializing in land use regulations, zoning compliance, development rights analysis, and regulatory risk assessment.',
	inputLabel: 'Zoning Data'
});
