import { WorkflowNode } from '../WorkflowNode';

export const analysisReportNode = new WorkflowNode({
	id: 'analysis-report',
	type: 'output',
	label: 'Analysis Report',
	icon: '📈',
	execute: (input) => input
});
