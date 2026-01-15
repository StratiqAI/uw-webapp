import { createAIWorkflowNode } from './createAIWorkflowNode';

export const financialModelingNode = createAIWorkflowNode({
	id: 'ai-financial-modeling',
	label: 'Financial Modeling',
	description: 'Create comprehensive financial models with cash flow and return analysis',
	prompt:
		'Create a comprehensive financial model for this commercial real estate investment. Analyze cash flows, returns (IRR, equity multiple), debt service coverage, and provide sensitivity analysis: {input}',
	systemPrompt:
		'You are a commercial real estate financial modeling expert specializing in investment analysis, cash flow projections, return calculations, and financial underwriting.',
	inputLabel: 'Financial Data'
});
