import { WorkflowNode } from '../WorkflowNode';

export const onImageNode = new WorkflowNode({
	id: 'input-on-image',
	type: 'input',
	label: 'On Image',
	icon: '🖼️',
	description: 'Triggered when an image is processed. Receives image data and metadata.',
	execute: (input) =>
		input || {
			imageId: '',
			url: '',
			width: 0,
			height: 0,
			format: '',
			documentId: '',
			pageNumber: 0,
			metadata: {}
		}
});
