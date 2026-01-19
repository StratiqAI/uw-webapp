import { WorkflowNode } from '../WorkflowNode';

export const investmentReportNode = new WorkflowNode({
	id: 'investment-report',
	type: 'output',
	label: 'Investment Report',
	icon: '📄',
	execute: (input) => input
});
