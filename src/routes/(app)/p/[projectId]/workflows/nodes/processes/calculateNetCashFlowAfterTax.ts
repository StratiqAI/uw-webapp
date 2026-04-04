import { WorkflowNode } from '../WorkflowNode';

export const calculateNetCashFlowAfterTaxNode = new WorkflowNode({
	id: 'calculate-net-cash-flow-after-tax',
	type: 'process',
	label: 'Calculate Net Cash Flow After Tax',
	icon: 'CF-Tax',
	description: 'Calculate cash flow after accounting for tax liability.',
	requiredInputs: [
		{
			name: 'cashFlow',
			description: 'Cash flow before taxes.',
			alternateNames: ['annualCashFlow', 'preTaxCashFlow']
		},
		{
			name: 'taxLiability',
			description: 'Annual tax liability on the property.',
			alternateNames: ['taxes', 'tax']
		}
	],
	formula: 'Net Cash Flow After Tax = cashFlow − taxLiability',
	execute: (input) => {
		if (typeof input === 'object' && input !== null) {
			const o = input as Record<string, unknown>;
			const cashFlow = (o.cashFlow ?? o.annualCashFlow ?? o.preTaxCashFlow) as number || 0;
			const tax = (o.taxLiability ?? o.taxes ?? o.tax) as number || 0;
			return (cashFlow - tax).toFixed(2);
		}
		return '0.00';
	}
});
