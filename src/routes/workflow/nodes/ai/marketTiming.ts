import { createAIWorkflowNode } from './createAIWorkflowNode';

export const marketTimingNode = createAIWorkflowNode({
	id: 'ai-market-timing',
	label: 'Market Timing',
	prompt:
		'Analyze optimal market timing for this commercial real estate transaction. Evaluate market cycles, economic indicators, interest rate trends, and optimal timing for acquisition or disposition: {input}',
	systemPrompt:
		'You are a commercial real estate market strategist expert in market cycle analysis, economic indicators, and transaction timing optimization.',
	inputLabel: 'Market Data'
});
