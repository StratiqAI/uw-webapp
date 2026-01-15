import { createAIWorkflowNode } from './createAIWorkflowNode';

export const propertyAnalysisNode = createAIWorkflowNode({
	id: 'ai-property-analysis',
	label: 'Property Analysis',
	description: 'Analyze commercial real estate properties with comprehensive assessments',
	prompt:
		'Analyze this commercial real estate property and provide a comprehensive assessment including property condition, location analysis, and investment potential: {input}',
	systemPrompt:
		'You are an expert commercial real estate analyst with deep knowledge of property valuation, market analysis, and investment strategies.',
	inputLabel: 'Input',
	formatInputForPlaceholder: (input) => String(input),
	formatInputForAppend: (input) => JSON.stringify(input)
});
