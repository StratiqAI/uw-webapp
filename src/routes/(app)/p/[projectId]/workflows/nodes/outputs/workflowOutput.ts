import { WorkflowNode } from '../WorkflowNode';

/**
 * Workflow Output Node
 * 
 * This is a special output node that serves as the single, definitive output sink for a workflow.
 * All workflow data should flow into this node. It has no outgoing connections (it's the final sink).
 * 
 * The workflow's output schema is defined at the workflow level and validated against this node's output.
 */
export const workflowOutputNode = new WorkflowNode({
	id: 'workflow-output',
	type: 'output',
	label: 'Workflow Output',
	icon: '🎯',
	description: 'The single output point for this workflow. Define the output schema in workflow settings.',
	execute: (input) => input // Pass through - the input becomes the workflow output
});
