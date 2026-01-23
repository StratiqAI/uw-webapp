import { WorkflowNode } from '../WorkflowNode';

export const calculateCashOnCashNode = new WorkflowNode({
	id: 'calculate-cash-on-cash',
	type: 'process',
	label: 'Calculate Cash-on-Cash Return',
	icon: 'CoC',
	description: 'Calculate cash-on-cash return as a percentage of total cash invested.',
	requiredInputs: [
		{
			name: 'annualCashFlow',
			description: 'Annual cash flow after all expenses and debt service.',
			alternateNames: ['cashFlow']
		},
		{
			name: 'totalCashInvested',
			description: 'Total cash invested in the property (down payment + closing costs).',
			alternateNames: ['cashInvested', 'initialInvestment']
		}
	],
	formula: 'Cash-on-Cash = (annualCashFlow / totalCashInvested) × 100%',
	execute: (input) => {
		if (typeof input === 'object' && input !== null) {
			const o = input as Record<string, unknown>;
			const cashFlow = (o.annualCashFlow ?? o.cashFlow) as number || 0;
			const invested = (o.totalCashInvested ?? o.cashInvested ?? o.initialInvestment) as number || 0;
			if (invested > 0) {
				return ((cashFlow / invested) * 100).toFixed(2) + '%';
			}
		}
		return '0%';
	}
});
