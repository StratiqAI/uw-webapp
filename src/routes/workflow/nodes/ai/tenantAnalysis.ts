import { createAIWorkflowNode } from './createAIWorkflowNode';

export const tenantAnalysisNode = createAIWorkflowNode({
	id: 'ai-tenant-analysis',
	label: 'Tenant Analysis',
	description: 'Analyze tenant profiles, lease structures, and rent roll stability',
	prompt:
		'Analyze the tenant profile and lease structure for this commercial property. Evaluate tenant credit quality, lease terms, rent roll stability, and tenant concentration risks: {input}',
	systemPrompt:
		'You are an expert commercial real estate analyst specializing in tenant credit analysis, lease structure evaluation, and rent roll risk assessment.',
	inputLabel: 'Tenant Data'
});
