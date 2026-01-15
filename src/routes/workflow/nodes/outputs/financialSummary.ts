import { WorkflowNode } from '../WorkflowNode';

export const financialSummaryNode = new WorkflowNode({
	id: 'output-financial-summary',
	type: 'output',
	label: 'Financial Summary',
	icon: '💰',
	execute: (input) => input
});
