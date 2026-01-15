import { createAIWorkflowNode } from './createAIWorkflowNode';

export const comparableSalesAnalysisNode = createAIWorkflowNode({
	id: 'ai-comparable-sales-analysis',
	label: 'Comparable Sales Analysis',
	prompt:
		'Analyze comparable commercial real estate sales and provide valuation insights. Compare property characteristics, sale prices, cap rates, and price per square foot to assess market value: {input}',
	systemPrompt:
		'You are a commercial real estate valuation expert specializing in comparable sales analysis, market value assessment, and property valuation methodologies.',
	inputLabel: 'Comparable Sales Data'
});
