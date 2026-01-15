import { createAIWorkflowNode } from './createAIWorkflowNode';

export const propertyRepositioningNode = createAIWorkflowNode({
	id: 'ai-property-repositioning',
	label: 'Property Repositioning',
	prompt:
		'Develop a property repositioning strategy for this commercial property. Analyze repositioning opportunities, target market repositioning, renovation requirements, and repositioning economics: {input}',
	systemPrompt:
		'You are a commercial real estate repositioning strategist expert in property transformation, market repositioning, and value creation through repositioning.',
	inputLabel: 'Property Data'
});
