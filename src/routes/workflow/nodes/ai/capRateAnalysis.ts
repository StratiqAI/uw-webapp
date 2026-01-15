import { createAIWorkflowNode } from './createAIWorkflowNode';

export const capRateAnalysisNode = createAIWorkflowNode({
	id: 'ai-cap-rate-analysis',
	label: 'Cap Rate Analysis',
	description: 'Analyze capitalization rates and yield metrics',
	prompt:
		'Analyze capitalization rates for this commercial property investment. Evaluate market cap rates, going-in cap rates, exit cap rates, and cap rate compression/expansion risks: {input}',
	systemPrompt:
		'You are a commercial real estate investment analyst expert in cap rate analysis, yield analysis, and capitalization rate trends.',
	inputLabel: 'Investment Data'
});
