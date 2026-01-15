import { createAIWorkflowNode } from './createAIWorkflowNode';

export const refinancingAnalysisNode = createAIWorkflowNode({
	id: 'ai-refinancing-analysis',
	label: 'Refinancing Analysis',
	prompt:
		'Analyze refinancing opportunities for this commercial property. Evaluate current loan terms, refinancing options, interest rate savings, and optimal refinancing timing: {input}',
	systemPrompt:
		'You are a commercial real estate finance expert specializing in refinancing strategies, loan restructuring, and debt optimization.',
	inputLabel: 'Loan Data'
});
