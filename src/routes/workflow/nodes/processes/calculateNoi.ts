import { WorkflowNode } from '../WorkflowNode';

export const calculateNoiNode = new WorkflowNode({
	id: 'process-calculate-noi',
	type: 'process',
	label: 'Calculate NOI',
	icon: 'NOI',
	execute: (input) => {
		if (typeof input === 'object' && input !== null) {
			const rent = input.annualRent || input.rent || 0;
			const expenses = input.operatingExpenses || input.expenses || 0;
			return rent - expenses;
		}
		return 0;
	}
});
