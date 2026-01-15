import { createAIWorkflowNode } from './createAIWorkflowNode';

export const leaseAbstractNode = createAIWorkflowNode({
	id: 'ai-lease-abstract',
	label: 'Lease Abstract',
	description: 'Create comprehensive lease abstracts and summaries',
	prompt:
		'Create a comprehensive lease abstract for this commercial property lease. Extract and summarize key lease terms, rent structure, expiration dates, renewal options, and critical lease provisions: {input}',
	systemPrompt:
		'You are a commercial real estate lease analyst expert in lease abstraction, lease term extraction, and lease document analysis.',
	inputLabel: 'Lease Data'
});
