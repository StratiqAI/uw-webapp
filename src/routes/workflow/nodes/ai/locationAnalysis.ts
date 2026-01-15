import { createAIWorkflowNode } from './createAIWorkflowNode';

export const locationAnalysisNode = createAIWorkflowNode({
	id: 'ai-location-analysis',
	label: 'Location Analysis',
	prompt:
		'Analyze the location characteristics of this commercial property. Evaluate demographics, traffic patterns, accessibility, nearby amenities, competition, and location-based risks and opportunities: {input}',
	systemPrompt:
		'You are a commercial real estate location analyst expert in site selection, demographic analysis, traffic studies, and location-based market evaluation.',
	inputLabel: 'Location Data'
});
