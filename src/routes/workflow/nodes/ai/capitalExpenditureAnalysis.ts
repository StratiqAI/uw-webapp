import { createAIWorkflowNode } from './createAIWorkflowNode';

export const capitalExpenditureAnalysisNode = createAIWorkflowNode({
	id: 'ai-capital-expenditure-analysis',
	label: 'CapEx Analysis',
	prompt:
		'Analyze the capital expenditure requirements for this commercial property. Assess deferred maintenance, required improvements, roof/HVAC systems, and estimate future CapEx needs: {input}',
	systemPrompt:
		'You are a commercial real estate property condition expert specializing in building systems analysis, deferred maintenance assessment, and capital expenditure planning.',
	inputLabel: 'Property Data'
});
