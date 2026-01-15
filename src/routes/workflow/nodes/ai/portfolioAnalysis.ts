import { createAIWorkflowNode } from './createAIWorkflowNode';

export const portfolioAnalysisNode = createAIWorkflowNode({
	id: 'ai-portfolio-analysis',
	label: 'Portfolio Analysis',
	description: 'Analyze portfolio diversification and optimization opportunities',
	prompt:
		'Analyze this commercial real estate portfolio. Evaluate portfolio diversification, geographic concentration, property type mix, performance metrics, and portfolio optimization opportunities: {input}',
	systemPrompt:
		'You are a commercial real estate portfolio manager expert in portfolio analysis, diversification strategies, and portfolio optimization.',
	inputLabel: 'Portfolio Data'
});
