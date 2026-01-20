import { WorkflowNode } from '../WorkflowNode';

export const onDocumentUploadNode = new WorkflowNode({
	id: 'on-document-upload',
	type: 'input',
	label: 'On Document Upload',
	icon: '📄',
	description: 'Triggered when a document is uploaded. Receives document metadata and content.',
	defaultInput: {
		source: 'com.stratiqai.doclink',
		detailType: 'Created'
	},
	execute: (input) =>
		input || {
			source: 'com.stratiqai.doclink',
			detailType: 'Created'
		}
});
