import { WorkflowNode } from '../WorkflowNode';

export const calculateGrmNode = new WorkflowNode({
	id: 'calculate-grm',
	type: 'process',
	label: 'Calculate GRM',
	icon: 'GRM',
	description: 'Calculate Gross Rent Multiplier from purchase price and annual gross rental income.',
	requiredInputs: [
		{
			name: 'purchasePrice',
			description: 'Property purchase price.',
			alternateNames: ['price']
		},
		{
			name: 'annualGrossRent',
			description: 'Total annual gross rental income.',
			alternateNames: ['grossRent', 'annualRent']
		}
	],
	formula: 'GRM = purchasePrice / annualGrossRent',
	execute: (input) => {
		if (typeof input === 'object' && input !== null) {
			const o = input as Record<string, unknown>;
			const price = (o.purchasePrice ?? o.price) as number || 0;
			const rent = (o.annualGrossRent ?? o.grossRent ?? o.annualRent) as number || 0;
			if (rent > 0) {
				return (price / rent).toFixed(2);
			}
		}
		return '0.00';
	}
});
