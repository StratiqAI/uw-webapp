import { createAIWorkflowNode } from './createAIWorkflowNode';

export const marketAnalysisNode = createAIWorkflowNode({
	id: 'ai-market-analysis',
	label: 'Market Analysis',
	prompt:
		'Analyze the commercial real estate market data and provide insights on market trends, comparable properties, and market conditions: {input}',
	systemPrompt:
		'You are an expert commercial real estate market analyst specializing in market trends, comparable sales analysis, and economic indicators.',
	inputLabel: 'Market Data'
});
