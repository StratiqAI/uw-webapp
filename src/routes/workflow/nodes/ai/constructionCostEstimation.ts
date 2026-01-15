import { createAIWorkflowNode } from './createAIWorkflowNode';

export const constructionCostEstimationNode = createAIWorkflowNode({
	id: 'ai-construction-cost-estimation',
	label: 'Construction Cost Estimation',
	prompt:
		'Estimate construction costs for this commercial real estate development or renovation project. Analyze material costs, labor costs, contractor pricing, and construction cost trends: {input}',
	systemPrompt:
		'You are a commercial construction cost estimator expert in construction cost analysis, material pricing, and construction cost estimation methodologies.',
	inputLabel: 'Project Data'
});
