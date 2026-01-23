import { WorkflowNode } from '../WorkflowNode';

export const calculateDscrNode = new WorkflowNode({
	id: 'calculate-dscr',
	type: 'process',
	label: 'Calculate DSCR',
	icon: 'DSCR',
	description: 'Calculate Debt Service Coverage Ratio.',
	requiredInputs: [
		{
			name: 'noi',
			description: 'Net Operating Income (annual).',
			alternateNames: ['netOperatingIncome']
		},
		{
			name: 'debtService',
			description: 'Monthly debt service payment.',
			alternateNames: ['monthlyPayment']
		}
	],
	formula: 'DSCR = NOI / (debtService × 12)',
	execute: (input) => {
		if (typeof input === 'object' && input !== null) {
			const o = input as Record<string, unknown>;
			const noi = (o.noi ?? o.netOperatingIncome) as number || 0;
			const debtService = (o.debtService ?? o.monthlyPayment) as number || 0;
			if (debtService > 0) {
				return (noi / (debtService * 12)).toFixed(2);
			}
		}
		return '0.00';
	}
});
