import { createAIWorkflowNode } from './createAIWorkflowNode';

export const debtStructureAnalysisNode = createAIWorkflowNode({
	id: 'ai-debt-structure-analysis',
	label: 'Debt Structure Analysis',
	description: 'Analyze debt structures, loan terms, and financing strategies',
	prompt:
		'Analyze the debt structure and financing terms for this commercial property investment. Evaluate loan terms, interest rates, amortization schedules, prepayment penalties, and refinancing risks: {input}',
	systemPrompt:
		'You are a commercial real estate finance expert specializing in debt structuring, loan analysis, financing strategies, and debt service optimization.',
	inputLabel: 'Debt Data'
});
