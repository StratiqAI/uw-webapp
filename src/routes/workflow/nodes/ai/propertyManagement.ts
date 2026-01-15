import { createAIWorkflowNode } from './createAIWorkflowNode';

export const propertyManagementNode = createAIWorkflowNode({
	id: 'ai-property-management',
	label: 'Property Management',
	prompt:
		'Develop property management strategies for this commercial property. Analyze maintenance programs, tenant relations, operational efficiency, and property management best practices: {input}',
	systemPrompt:
		'You are a commercial real estate property manager expert in property operations, maintenance management, tenant relations, and operational optimization.',
	inputLabel: 'Property Data'
});
