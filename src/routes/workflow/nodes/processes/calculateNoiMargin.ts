import { WorkflowNode } from '../WorkflowNode';

export const calculateNoiMarginNode = new WorkflowNode({
	id: 'calculate-noi-margin',
	type: 'process',
	label: 'Calculate NOI Margin',
	icon: 'NOI%',
	description: 'Calculate Net Operating Income margin as a percentage of gross operating income.',
	requiredInputs: [
		{
			name: 'noi',
			description: 'Net Operating Income (annual).',
			alternateNames: ['netOperatingIncome']
		},
		{
			name: 'grossOperatingIncome',
			description: 'Total gross operating income (before expenses).',
			alternateNames: ['grossIncome', 'grossRent']
		}
	],
	formula: 'NOI Margin = (NOI / grossOperatingIncome) × 100%',
	execute: (input) => {
		if (typeof input === 'object' && input !== null) {
			const o = input as Record<string, unknown>;
			const noi = (o.noi ?? o.netOperatingIncome) as number || 0;
			const grossIncome = (o.grossOperatingIncome ?? o.grossIncome ?? o.grossRent) as number || 0;
			if (grossIncome > 0) {
				return ((noi / grossIncome) * 100).toFixed(2) + '%';
			}
		}
		return '0%';
	}
});
