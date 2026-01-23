import { WorkflowNode } from '../WorkflowNode';

export const calculateMinDscrNode = new WorkflowNode({
	id: 'calculate-min-dscr',
	type: 'process',
	label: 'Calculate Min Required NOI',
	icon: 'MinDSCR',
	description: 'Calculate minimum required NOI to meet a target DSCR.',
	requiredInputs: [
		{
			name: 'requiredDscr',
			description: 'Required Debt Service Coverage Ratio.',
			alternateNames: ['targetDscr', 'dscr']
		},
		{
			name: 'debtService',
			description: 'Annual debt service payment.',
			alternateNames: ['annualDebtService', 'monthlyPayment']
		}
	],
	formula: 'Min Required NOI = requiredDscr × debtService',
	execute: (input) => {
		if (typeof input === 'object' && input !== null) {
			const o = input as Record<string, unknown>;
			const dscr = (o.requiredDscr ?? o.targetDscr ?? o.dscr) as number || 0;
			const debtService = (o.debtService ?? o.annualDebtService) as number || ((o.monthlyPayment as number || 0) * 12);
			return (dscr * debtService).toFixed(2);
		}
		return '0.00';
	}
});
