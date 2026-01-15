import { createAIWorkflowNode } from './createAIWorkflowNode';

export const dueDiligenceChecklistNode = createAIWorkflowNode({
	id: 'ai-due-diligence-checklist',
	label: 'Due Diligence Checklist',
	prompt:
		'Generate a comprehensive due diligence checklist for this commercial real estate acquisition. Include financial, legal, physical, environmental, and operational due diligence items: {input}',
	systemPrompt:
		'You are a commercial real estate due diligence expert specializing in acquisition due diligence, risk identification, and comprehensive property evaluation.',
	inputLabel: 'Property Data'
});
