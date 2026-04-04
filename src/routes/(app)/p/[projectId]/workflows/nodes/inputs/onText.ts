import { WorkflowNode } from '../WorkflowNode';

export const onTextNode = new WorkflowNode({
	id: 'on-text',
	type: 'input',
	label: 'On Text',
	icon: '📝',
	description: 'Triggered when text is extracted or processed. Receives text content and metadata.',
	execute: (input) =>
		input || {
			source: 'com.stratiqai.text',
			detailType: 'Created'
		}
});
