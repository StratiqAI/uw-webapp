import { WorkflowNode } from '../WorkflowNode';

export const calculateIcrNode = new WorkflowNode({
	id: 'calculate-icr',
	type: 'process',
	label: 'Calculate ICR',
	icon: 'ICR',
	description: 'Calculate Interest Coverage Ratio (NOI divided by annual interest payment).',
	requiredInputs: [
		{
			name: 'noi',
			description: 'Net Operating Income (annual).',
			alternateNames: ['netOperatingIncome']
		},
		{
			name: 'annualInterestPayment',
			description: 'Annual interest payment on the loan.',
			alternateNames: ['interestPayment', 'interest']
		}
	],
	formula: 'ICR = NOI / annualInterestPayment',
	execute: (input) => {
		if (typeof input === 'object' && input !== null) {
			const o = input as Record<string, unknown>;
			const noi = (o.noi ?? o.netOperatingIncome) as number || 0;
			const interest = (o.annualInterestPayment ?? o.interestPayment ?? o.interest) as number || 0;
			if (interest > 0) {
				return (noi / interest).toFixed(2);
			}
		}
		return '0.00';
	}
});
