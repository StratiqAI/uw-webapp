import { createAIWorkflowNode } from './createAIWorkflowNode';

export const tenantRetentionNode = createAIWorkflowNode({
	id: 'ai-tenant-retention',
	label: 'Tenant Retention',
	description: 'Develop tenant retention and renewal strategies',
	prompt:
		'Develop tenant retention strategies for this commercial property. Analyze tenant satisfaction factors, renewal incentives, lease renewal probabilities, and retention best practices: {input}',
	systemPrompt:
		'You are a commercial real estate tenant relations expert specializing in tenant retention, lease renewals, and tenant satisfaction strategies.',
	inputLabel: 'Tenant Data'
});
