import { WorkflowNode } from '../WorkflowNode';

export const eventNode = new WorkflowNode({
	id: 'event',
	type: 'input',
	label: 'Event',
	icon: '📣',
	description: 'Configure an AWS EventBridge event payload with source and detail type.',
	execute: (input) =>
		input || {
			source: 'stratiqai.workflow',
			detailType: 'WorkflowEvent'
		}
});
