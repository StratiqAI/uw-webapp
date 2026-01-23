import { WorkflowNode } from '../WorkflowNode';

export const calculateOerNode = new WorkflowNode({
	id: 'calculate-oer',
	type: 'process',
	label: 'Calculate OER',
	icon: 'OER',
	description: 'Calculate Operating Expense Ratio as a percentage of gross operating income.',
	requiredInputs: [
		{
			name: 'operatingExpenses',
			description: 'Total annual operating expenses.',
			alternateNames: ['expenses']
		},
		{
			name: 'grossOperatingIncome',
			description: 'Total gross operating income (before expenses).',
			alternateNames: ['grossIncome', 'grossRent']
		}
	],
	formula: 'OER = (operatingExpenses / grossOperatingIncome) × 100%',
	execute: (input) => {
		if (typeof input === 'object' && input !== null) {
			const o = input as Record<string, unknown>;
			const expenses = (o.operatingExpenses ?? o.expenses) as number || 0;
			const grossIncome = (o.grossOperatingIncome ?? o.grossIncome ?? o.grossRent) as number || 0;
			if (grossIncome > 0) {
				return ((expenses / grossIncome) * 100).toFixed(2) + '%';
			}
		}
		return '0%';
	}
});
