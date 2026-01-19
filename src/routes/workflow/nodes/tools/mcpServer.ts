import { WorkflowNode } from '../WorkflowNode';

export const mcpServerNode = new WorkflowNode({
	id: 'mcp-server',
	type: 'tools',
	label: 'MCP Server',
	icon: 'M',
	description: 'Access external tools and services via Model Context Protocol (MCP) server.',
	execute: (input) => input || { purchasePrice: 0, annualRent: 0, operatingExpenses: 0 },
	toolType: 'mcp',
	defaultInput: { purchasePrice: 0, annualRent: 0, operatingExpenses: 0 }
});
