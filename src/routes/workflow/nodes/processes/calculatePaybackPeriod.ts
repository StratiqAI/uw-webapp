import { WorkflowNode } from '../WorkflowNode';

export const calculatePaybackPeriodNode = new WorkflowNode({
	id: 'calculate-payback-period',
	type: 'process',
	label: 'Calculate Payback Period',
	icon: 'Payback',
	description: 'Calculate payback period in years (initial investment divided by annual cash flow).',
	requiredInputs: [
		{
			name: 'initialInvestment',
			description: 'Initial investment amount.',
			alternateNames: ['investment', 'totalCashInvested']
		},
		{
			name: 'annualCashFlow',
			description: 'Annual cash flow after all expenses and debt service.',
			alternateNames: ['cashFlow']
		}
	],
	formula: 'Payback Period = initialInvestment / annualCashFlow',
	execute: (input) => {
		if (typeof input === 'object' && input !== null) {
			const o = input as Record<string, unknown>;
			const investment = (o.initialInvestment ?? o.investment ?? o.totalCashInvested) as number || 0;
			const cashFlow = (o.annualCashFlow ?? o.cashFlow) as number || 0;
			if (cashFlow > 0) {
				return (investment / cashFlow).toFixed(2) + ' years';
			}
		}
		return '0.00 years';
	}
});
