import { WorkflowNode } from '../WorkflowNode';

export const calculateEquityMultipleNode = new WorkflowNode({
	id: 'calculate-equity-multiple',
	type: 'process',
	label: 'Calculate Equity Multiple',
	icon: 'EM',
	description: 'Calculate equity multiple (total distributions divided by initial equity investment).',
	requiredInputs: [
		{
			name: 'totalDistributions',
			description: 'Total distributions received over the investment period.',
			alternateNames: ['distributions', 'totalReturns']
		},
		{
			name: 'initialEquity',
			description: 'Initial equity investment.',
			alternateNames: ['equityInvestment', 'initialInvestment']
		}
	],
	formula: 'Equity Multiple = totalDistributions / initialEquity',
	execute: (input) => {
		if (typeof input === 'object' && input !== null) {
			const o = input as Record<string, unknown>;
			const distributions = (o.totalDistributions ?? o.distributions ?? o.totalReturns) as number || 0;
			const equity = (o.initialEquity ?? o.equityInvestment ?? o.initialInvestment) as number || 0;
			if (equity > 0) {
				return (distributions / equity).toFixed(2) + 'x';
			}
		}
		return '0.00x';
	}
});
