import { WorkflowNode } from '../WorkflowNode';

export const calculateDebtYieldNode = new WorkflowNode({
	id: 'calculate-debt-yield',
	type: 'process',
	label: 'Calculate Debt Yield',
	icon: 'DY',
	description: 'Calculate debt yield (NOI divided by loan amount).',
	requiredInputs: [
		{
			name: 'noi',
			description: 'Net Operating Income (annual).',
			alternateNames: ['netOperatingIncome']
		},
		{
			name: 'loanAmount',
			description: 'Total loan amount.',
			alternateNames: ['loan', 'mortgageAmount']
		}
	],
	formula: 'Debt Yield = (NOI / loanAmount) × 100%',
	execute: (input) => {
		if (typeof input === 'object' && input !== null) {
			const o = input as Record<string, unknown>;
			const noi = (o.noi ?? o.netOperatingIncome) as number || 0;
			const loan = (o.loanAmount ?? o.loan ?? o.mortgageAmount) as number || 0;
			if (loan > 0) {
				return ((noi / loan) * 100).toFixed(2) + '%';
			}
		}
		return '0%';
	}
});
