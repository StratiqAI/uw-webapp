import { createAIWorkflowNode } from './createAIWorkflowNode';

export const demographicAnalysisNode = createAIWorkflowNode({
	id: 'ai-demographic-analysis',
	label: 'Demographic Analysis',
	description: 'Analyze demographic trends and characteristics',
	prompt:
		'Analyze demographic trends and characteristics for this commercial property location. Evaluate population growth, income levels, employment trends, and demographic risk factors: {input}',
	systemPrompt:
		'You are a commercial real estate demographic analyst expert in population analysis, demographic trends, and location-based demographic evaluation.',
	inputLabel: 'Demographic Data'
});
