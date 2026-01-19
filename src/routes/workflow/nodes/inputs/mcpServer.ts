import { WorkflowNode } from '../WorkflowNode';

export const mcpServerNode = new WorkflowNode({
	id: 'financial-metrics',
	type: 'input',
	label: 'MCP Server',
	icon: 'M',
	description: 'Input financial metrics including purchase price, annual rent, and operating expenses.',
	execute: (input) => input || { purchasePrice: 0, annualRent: 0, operatingExpenses: 0 }
});
