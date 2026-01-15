import { WorkflowNode } from '../WorkflowNode';

export const documentKnowledgeBaseNode = new WorkflowNode({
	id: 'input-property-data',
	type: 'input',
	label: 'Document Knowledge Base',
	icon: '🏢',
	execute: (input) => input || { address: '', sqft: 0, yearBuilt: 0, propertyType: 'Office' }
});
