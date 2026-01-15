import { WorkflowNode } from '../WorkflowNode';

export const analysisReportNode = new WorkflowNode({
	id: 'output-analysis-report',
	type: 'output',
	label: 'Analysis Report',
	icon: '📈',
	execute: (input) => input
});
