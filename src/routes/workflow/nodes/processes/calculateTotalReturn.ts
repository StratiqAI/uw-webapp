import { WorkflowNode } from '../WorkflowNode';

export const calculateTotalReturnNode = new WorkflowNode({
	id: 'calculate-total-return',
	type: 'process',
	label: 'Calculate Total Return',
	icon: 'Return%',
	description: 'Calculate total return including cash flow and appreciation as a percentage of initial investment.',
	requiredInputs: [
		{
			name: 'cashFlow',
			description: 'Total cash flow received.',
			alternateNames: ['annualCashFlow', 'totalCashFlow']
		},
		{
			name: 'appreciation',
			description: 'Property appreciation amount.',
			alternateNames: ['valueIncrease', 'gain']
		},
		{
			name: 'initialInvestment',
			description: 'Initial investment amount.',
			alternateNames: ['investment', 'totalCashInvested']
		}
	],
	formula: 'Total Return = ((cashFlow + appreciation) / initialInvestment) × 100%',
	execute: (input) => {
		if (typeof input === 'object' && input !== null) {
			const o = input as Record<string, unknown>;
			const cashFlow = (o.cashFlow ?? o.annualCashFlow ?? o.totalCashFlow) as number || 0;
			const appreciation = (o.appreciation ?? o.valueIncrease ?? o.gain) as number || 0;
			const investment = (o.initialInvestment ?? o.investment ?? o.totalCashInvested) as number || 0;
			if (investment > 0) {
				return (((cashFlow + appreciation) / investment) * 100).toFixed(2) + '%';
			}
		}
		return '0%';
	}
});
