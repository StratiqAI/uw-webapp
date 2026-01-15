import { createAIWorkflowNode } from './createAIWorkflowNode';

export const legalComplianceNode = createAIWorkflowNode({
	id: 'ai-legal-compliance',
	label: 'Legal Compliance',
	description: 'Assess legal compliance and regulatory requirements',
	prompt:
		'Assess legal compliance requirements for this commercial property. Evaluate lease compliance, ADA requirements, building codes, environmental regulations, and legal risk factors: {input}',
	systemPrompt:
		'You are a commercial real estate legal compliance expert specializing in property law, regulatory compliance, and legal risk assessment.',
	inputLabel: 'Property Data'
});
