import { WorkflowNode } from '../WorkflowNode';

export const calculateNoiNode = new WorkflowNode({
	id: 'calculate-noi',
	type: 'process',
	label: 'Calculate NOI',
	icon: 'NOI',
	description: 'Calculate Net Operating Income from rent and expenses.',
	requiredInputs: [
		{
			name: 'annualRent',
			description: 'Total annual rental income.',
			alternateNames: ['rent']
		},
		{
			name: 'operatingExpenses',
			description: 'Total annual operating expenses.',
			alternateNames: ['expenses']
		}
	],
	formula: 'NOI = annualRent − operatingExpenses',
	execute: (input) => {
		if (typeof input === 'object' && input !== null) {
			const o = input as Record<string, unknown>;
			const rent = (o.annualRent ?? o.rent) as number || 0;
			const expenses = (o.operatingExpenses ?? o.expenses) as number || 0;
			return rent - expenses;
		}
		return 0;
	}
});
