import { WorkflowNode } from '../WorkflowNode';

export const onImageNode = new WorkflowNode({
	id: 'on-image',
	type: 'input',
	label: 'On Image',
	icon: '🖼️',
	description: 'Triggered when an image is processed. Receives image data and metadata.',
	execute: (input) =>
		input || {
			source: 'com.stratiqai.image',
			detailType: 'Created'
		}
});
