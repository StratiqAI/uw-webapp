import { WorkflowNode } from '../WorkflowNode';

export const calculateCapRateNode = new WorkflowNode({
	id: 'calculate-cap-rate',
	type: 'process',
	label: 'Calculate Cap Rate',
	icon: '%',
	description: 'Calculate capitalization rate from NOI and purchase price.',
	requiredInputs: [
		{
			name: 'noi',
			description: 'Net Operating Income (annual).',
			alternateNames: ['netOperatingIncome']
		},
		{
			name: 'purchasePrice',
			description: 'Property purchase price.',
			alternateNames: ['price']
		}
	],
	formula: 'Cap Rate = (NOI / purchasePrice) × 100%',
	execute: (input) => {
		if (typeof input === 'object' && input !== null) {
			const o = input as Record<string, unknown>;
			const noi = (o.noi ?? o.netOperatingIncome) as number || 0;
			const price = (o.purchasePrice ?? o.price) as number || 0;
			if (price > 0) {
				return ((noi / price) * 100).toFixed(2) + '%';
			}
		}
		return '0%';
	}
});
