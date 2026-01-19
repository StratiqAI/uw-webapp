import { WorkflowNode } from '../WorkflowNode';

export const documentKnowledgeBaseNode = new WorkflowNode({
	id: 'property-data',
	type: 'input',
	label: 'Document Knowledge Base',
	icon: '🏢',
	description: 'Input property information including address, square footage, and property type.',
	execute: (input) => input || { projectId: '' }
});
