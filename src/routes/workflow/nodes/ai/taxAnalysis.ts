import { createAIWorkflowNode } from './createAIWorkflowNode';

export const taxAnalysisNode = createAIWorkflowNode({
	id: 'ai-tax-analysis',
	label: 'Tax Analysis',
	description: 'Evaluate tax implications, depreciation benefits, and tax planning',
	prompt:
		'Analyze the tax implications for this commercial real estate investment. Evaluate property taxes, income tax considerations, depreciation benefits, 1031 exchange opportunities, and tax-efficient structuring: {input}',
	systemPrompt:
		'You are a commercial real estate tax advisor expert in property tax assessment, real estate tax planning, depreciation strategies, and tax-efficient investment structures.',
	inputLabel: 'Tax Data'
});
