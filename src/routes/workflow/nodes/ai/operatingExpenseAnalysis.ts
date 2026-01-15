import { createAIWorkflowNode } from './createAIWorkflowNode';

export const operatingExpenseAnalysisNode = createAIWorkflowNode({
	id: 'ai-operating-expense-analysis',
	label: 'Operating Expense Analysis',
	prompt:
		'Analyze operating expenses for this commercial property. Evaluate expense ratios, expense trends, expense recoveries, and operating expense optimization opportunities: {input}',
	systemPrompt:
		'You are a commercial real estate operations analyst expert in operating expense analysis, expense management, and cost optimization.',
	inputLabel: 'Expense Data'
});
