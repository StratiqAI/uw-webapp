import { WorkflowNode } from '../WorkflowNode';

export const documentKnowledgeBaseNode = new WorkflowNode({
	id: 'document-knowledge-base',
	type: 'tools',
	label: 'Document Knowledge Base',
	icon: '🏢',
	description: 'Query documents from the knowledge base using semantic search.',
	execute: (input) => input || { projectId: '' },
	toolType: 'knowledge-base',
	defaultInput: { projectId: '' }
});
