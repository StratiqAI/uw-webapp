import { createAIWorkflowNode } from './createAIWorkflowNode';

export const incomeApproachValuationNode = createAIWorkflowNode({
	id: 'ai-income-approach-valuation',
	label: 'Income Approach Valuation',
	prompt:
		'Perform an income approach valuation for this commercial property. Analyze net operating income, capitalization rates, discount rates, and income-based property value: {input}',
	systemPrompt:
		'You are a commercial real estate appraiser expert in income approach valuation, DCF analysis, and income-based property appraisal.',
	inputLabel: 'Income Data'
});
