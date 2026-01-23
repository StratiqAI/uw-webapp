import { WorkflowNode } from '../WorkflowNode';

export const calculateCashFlowNode = new WorkflowNode({
	id: 'calculate-cash-flow',
	type: 'process',
	label: 'Calculate Cash Flow',
	icon: 'CF',
	description: 'Calculate annual cash flow from NOI and debt service.',
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
	formula: 'Cash Flow = NOI − (debtService × 12)',
	execute: (input) => {
		if (typeof input === 'object' && input !== null) {
			const o = input as Record<string, unknown>;
			const noi = (o.noi ?? o.netOperatingIncome) as number || 0;
			const debtService = (o.debtService ?? o.monthlyPayment) as number || 0;
			return noi - (debtService * 12);
		}
		return 0;
	}
});
