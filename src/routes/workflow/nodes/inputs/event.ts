import { WorkflowNode } from '../WorkflowNode';

export const eventNode = new WorkflowNode({
	id: 'input-event',
	type: 'input',
	label: 'Event',
	icon: '📣',
	execute: (input) =>
		input || {
			eventBusName: 'default',
			source: 'stratiqai.workflow',
			detailType: 'WorkflowEvent',
			detail: {},
			resources: [],
			region: 'us-east-1',
			account: '',
			time: ''
		}
});
