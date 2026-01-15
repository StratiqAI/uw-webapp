import { createAIWorkflowNode } from './createAIWorkflowNode';

export const competitionAnalysisNode = createAIWorkflowNode({
	id: 'ai-competition-analysis',
	label: 'Competition Analysis',
	description: 'Analyze competitive landscape and market positioning',
	prompt:
		'Analyze the competitive landscape for this commercial property. Evaluate competing properties, market positioning, competitive advantages, and competitive risks: {input}',
	systemPrompt:
		'You are a commercial real estate market analyst expert in competitive analysis, market positioning, and competitive strategy evaluation.',
	inputLabel: 'Competition Data'
});
