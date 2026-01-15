import { createAIWorkflowNode } from './createAIWorkflowNode';

export const exitStrategyNode = createAIWorkflowNode({
	id: 'ai-exit-strategy',
	label: 'Exit Strategy',
	prompt:
		'Develop an exit strategy for this commercial real estate investment. Analyze optimal hold period, exit timing, potential exit strategies (sale, refinance, 1031 exchange), and exit value projections: {input}',
	systemPrompt:
		'You are a commercial real estate investment strategist expert in exit planning, hold period optimization, and exit strategy execution.',
	inputLabel: 'Investment Data'
});
