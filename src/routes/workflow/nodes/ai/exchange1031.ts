import { createAIWorkflowNode } from './createAIWorkflowNode';

export const exchange1031Node = createAIWorkflowNode({
	id: 'ai-1031-exchange',
	label: '1031 Exchange',
	prompt:
		'Analyze 1031 exchange opportunities for this commercial real estate transaction. Evaluate exchange eligibility, timing requirements, replacement property criteria, and tax deferral benefits: {input}',
	systemPrompt:
		'You are a commercial real estate tax advisor expert in 1031 exchanges, like-kind exchange rules, and tax-deferred exchange strategies.',
	inputLabel: 'Transaction Data'
});
