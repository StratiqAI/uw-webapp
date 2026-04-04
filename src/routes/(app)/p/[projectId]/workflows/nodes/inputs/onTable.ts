import { WorkflowNode } from '../WorkflowNode';

export const onTableNode = new WorkflowNode({
	id: 'on-table',
	type: 'input',
	label: 'On Table',
	icon: '📊',
	description: 'Triggered when a table is extracted or processed. Receives table data and metadata.',
	execute: (input) =>
		input || {
			source: 'com.stratiqai.table',
			detailType: 'Created'
		}
});
