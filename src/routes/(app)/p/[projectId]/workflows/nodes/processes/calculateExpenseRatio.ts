import { WorkflowNode } from '../WorkflowNode';

export const calculateExpenseRatioNode = new WorkflowNode({
	id: 'calculate-expense-ratio',
	type: 'process',
	label: 'Calculate Expense Ratio',
	icon: 'Exp%',
	description: 'Calculate expense ratio (operating expenses divided by gross operating income).',
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
	formula: 'Expense Ratio = operatingExpenses / grossOperatingIncome',
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
