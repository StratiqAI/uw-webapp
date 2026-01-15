import { createAIWorkflowNode } from './createAIWorkflowNode';

export const tenantImprovementAnalysisNode = createAIWorkflowNode({
	id: 'ai-tenant-improvement-analysis',
	label: 'Tenant Improvement Analysis',
	description: 'Analyze tenant improvement costs and strategies',
	prompt:
		'Analyze tenant improvement requirements and costs for this commercial property. Evaluate TI allowances, build-out costs, tenant improvement economics, and TI negotiation strategies: {input}',
	systemPrompt:
		'You are a commercial real estate tenant improvement expert specializing in TI cost analysis, build-out planning, and tenant improvement negotiations.',
	inputLabel: 'TI Data'
});
