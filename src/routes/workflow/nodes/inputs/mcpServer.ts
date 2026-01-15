import { WorkflowNode } from '../WorkflowNode';

export const mcpServerNode = new WorkflowNode({
	id: 'input-financial-metrics',
	type: 'input',
	label: 'MCP Server',
	icon: 'M',
	execute: (input) => input || { purchasePrice: 0, annualRent: 0, operatingExpenses: 0 }
});
