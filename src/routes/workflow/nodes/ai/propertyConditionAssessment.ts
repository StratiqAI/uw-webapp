import { createAIWorkflowNode } from './createAIWorkflowNode';

export const propertyConditionAssessmentNode = createAIWorkflowNode({
	id: 'ai-property-condition-assessment',
	label: 'Property Condition Assessment',
	description: 'Assess physical condition and maintenance needs',
	prompt:
		'Assess the physical condition of this commercial property. Evaluate building systems, structural integrity, maintenance needs, and property condition risks: {input}',
	systemPrompt:
		'You are a commercial property inspector expert in building condition assessment, property inspections, and physical condition evaluation.',
	inputLabel: 'Property Data'
});
