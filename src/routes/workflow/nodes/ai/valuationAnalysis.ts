import { createAIWorkflowNode } from './createAIWorkflowNode';

export const valuationAnalysisNode = createAIWorkflowNode({
	id: 'ai-valuation-analysis',
	label: 'Valuation Analysis',
	prompt:
		'Perform a comprehensive valuation analysis for this commercial property using multiple approaches. Evaluate income approach, sales comparison approach, and cost approach to determine fair market value: {input}',
	systemPrompt:
		'You are a commercial real estate appraiser expert in property valuation methodologies, market value assessment, and appraisal standards.',
	inputLabel: 'Property Data'
});
