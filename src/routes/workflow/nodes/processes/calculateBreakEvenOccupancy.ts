import { WorkflowNode } from '../WorkflowNode';

export const calculateBreakEvenOccupancyNode = new WorkflowNode({
	id: 'calculate-break-even-occupancy',
	type: 'process',
	label: 'Calculate Break-Even Occupancy',
	icon: 'BEO',
	description: 'Calculate the minimum occupancy rate needed to cover all expenses and debt service.',
	requiredInputs: [
		{
			name: 'operatingExpenses',
			description: 'Total annual operating expenses.',
			alternateNames: ['expenses']
		},
		{
			name: 'debtService',
			description: 'Annual debt service payment.',
			alternateNames: ['annualDebtService', 'monthlyPayment']
		},
		{
			name: 'grossPotentialRent',
			description: 'Total gross potential rent if 100% occupied.',
			alternateNames: ['potentialRent', 'grossRent']
		}
	],
	formula: 'Break-Even Occupancy = (operatingExpenses + debtService) / grossPotentialRent',
	execute: (input) => {
		if (typeof input === 'object' && input !== null) {
			const o = input as Record<string, unknown>;
			const expenses = (o.operatingExpenses ?? o.expenses) as number || 0;
			const debtService = (o.debtService ?? o.annualDebtService) as number || ((o.monthlyPayment as number || 0) * 12);
			const potentialRent = (o.grossPotentialRent ?? o.potentialRent ?? o.grossRent) as number || 0;
			if (potentialRent > 0) {
				const breakEven = ((expenses + debtService) / potentialRent) * 100;
				return breakEven.toFixed(2) + '%';
			}
		}
		return '0%';
	}
});
