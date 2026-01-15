import { createAIWorkflowNode } from './createAIWorkflowNode';

export const environmentalAssessmentNode = createAIWorkflowNode({
	id: 'ai-environmental-assessment',
	label: 'Environmental Assessment',
	prompt:
		'Assess environmental risks and compliance for this commercial property. Evaluate potential contamination, environmental regulations, remediation requirements, and environmental liability: {input}',
	systemPrompt:
		'You are a commercial real estate environmental consultant expert in Phase I/II assessments, environmental risk evaluation, regulatory compliance, and remediation cost estimation.',
	inputLabel: 'Environmental Data'
});
