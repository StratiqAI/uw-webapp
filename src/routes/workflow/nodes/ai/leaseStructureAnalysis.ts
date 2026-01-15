import { createAIWorkflowNode } from './createAIWorkflowNode';

export const leaseStructureAnalysisNode = createAIWorkflowNode({
	id: 'ai-lease-structure-analysis',
	label: 'Lease Structure Analysis',
	description: 'Analyze lease structures, expiration schedules, and lease economics',
	prompt:
		'Analyze the lease structure and terms for this commercial property. Evaluate lease expiration schedules, rent escalations, renewal probabilities, and lease economics: {input}',
	systemPrompt:
		'You are a commercial real estate lease analyst expert in lease structure evaluation, rent roll analysis, lease expiration management, and lease economics.',
	inputLabel: 'Lease Data'
});
