import { WorkflowNode } from '../WorkflowNode';

export const usCensusNode = new WorkflowNode({
	id: 'input-market-data',
	type: 'input',
	label: 'US Census',
	icon: '📊',
	execute: (input) => input || { marketCapRate: 0, comparableSales: [], marketTrends: '' }
});
