import { createAIWorkflowNode } from './createAIWorkflowNode';

export const rentRollAnalysisNode = createAIWorkflowNode({
	id: 'ai-rent-roll-analysis',
	label: 'Rent Roll Analysis',
	description: 'Analyze rent rolls, market rents, and rent growth potential',
	prompt:
		'Analyze the rent roll for this commercial property. Evaluate current rents vs market rents, lease expiration schedule, tenant mix, rent growth potential, and rent roll stability: {input}',
	systemPrompt:
		'You are a commercial real estate rent roll analyst expert in lease analysis, rent optimization, and rent roll risk assessment.',
	inputLabel: 'Rent Roll Data'
});
