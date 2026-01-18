import { WorkflowNode } from '../WorkflowNode';

export const onDocumentUploadNode = new WorkflowNode({
	id: 'input-on-document-upload',
	type: 'input',
	label: 'On Document Upload',
	icon: '📄',
	description: 'Triggered when a document is uploaded. Receives document metadata and content.',
	execute: (input) =>
		input || {
			documentId: '',
			fileName: '',
			fileType: '',
			fileSize: 0,
			uploadedAt: '',
			projectId: '',
			metadata: {}
		}
});
