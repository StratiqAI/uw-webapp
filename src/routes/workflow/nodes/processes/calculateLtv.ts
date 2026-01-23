import { WorkflowNode } from '../WorkflowNode';

export const calculateLtvNode = new WorkflowNode({
	id: 'calculate-ltv',
	type: 'process',
	label: 'Calculate LTV',
	icon: 'LTV',
	description: 'Calculate Loan-to-Value ratio as a percentage.',
	requiredInputs: [
		{
			name: 'loanAmount',
			description: 'Total loan amount.',
			alternateNames: ['loan', 'mortgageAmount']
		},
		{
			name: 'propertyValue',
			description: 'Property appraised value or purchase price.',
			alternateNames: ['value', 'purchasePrice', 'appraisedValue']
		}
	],
	formula: 'LTV = (loanAmount / propertyValue) × 100%',
	execute: (input) => {
		if (typeof input === 'object' && input !== null) {
			const o = input as Record<string, unknown>;
			const loan = (o.loanAmount ?? o.loan ?? o.mortgageAmount) as number || 0;
			const value = (o.propertyValue ?? o.value ?? o.purchasePrice ?? o.appraisedValue) as number || 0;
			if (value > 0) {
				return ((loan / value) * 100).toFixed(2) + '%';
			}
		}
		return '0%';
	}
});
