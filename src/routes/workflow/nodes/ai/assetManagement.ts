import { createAIWorkflowNode } from './createAIWorkflowNode';

export const assetManagementNode = createAIWorkflowNode({
	id: 'ai-asset-management',
	label: 'Asset Management',
	prompt:
		'Develop an asset management strategy for this commercial property. Analyze value-add opportunities, operational improvements, tenant retention strategies, and asset optimization initiatives: {input}',
	systemPrompt:
		'You are a commercial real estate asset manager expert in property operations, value creation, tenant relations, and asset optimization strategies.',
	inputLabel: 'Property Data'
});
