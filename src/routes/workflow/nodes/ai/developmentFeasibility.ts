import { createAIWorkflowNode } from './createAIWorkflowNode';

export const developmentFeasibilityNode = createAIWorkflowNode({
	id: 'ai-development-feasibility',
	label: 'Development Feasibility',
	prompt:
		'Analyze the development feasibility for this commercial real estate project. Evaluate construction costs, development timelines, entitlement processes, and project economics: {input}',
	systemPrompt:
		'You are a commercial real estate development consultant expert in feasibility analysis, construction cost estimation, and development project evaluation.',
	inputLabel: 'Development Data'
});
