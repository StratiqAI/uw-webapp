import { WorkflowNode } from '../WorkflowNode';

export const usCensusNode = new WorkflowNode({
	id: 'input-market-data',
	type: 'input',
	label: 'US Census',
	icon: '📊',
	description: 'Input market data including cap rates, comparable sales, and market trends.',
	execute: (input) => input || { marketCapRate: 0, comparableSales: [], marketTrends: '' }
});
