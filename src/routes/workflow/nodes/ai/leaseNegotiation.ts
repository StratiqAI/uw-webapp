import { createAIWorkflowNode } from './createAIWorkflowNode';

export const leaseNegotiationNode = createAIWorkflowNode({
	id: 'ai-lease-negotiation',
	label: 'Lease Negotiation',
	description: 'Provide lease negotiation strategies and recommendations',
	prompt:
		'Provide lease negotiation strategies and recommendations for this commercial property. Analyze market lease rates, tenant improvement allowances, rent escalations, and lease term structures: {input}',
	systemPrompt:
		'You are a commercial real estate lease negotiator expert in lease structuring, market rate analysis, and lease negotiation strategies.',
	inputLabel: 'Lease Data'
});
