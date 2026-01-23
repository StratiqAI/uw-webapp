import { WorkflowNode } from '../WorkflowNode';

export const calculatePricePerSqftNode = new WorkflowNode({
	id: 'calculate-price-per-sqft',
	type: 'process',
	label: 'Calculate Price Per Sq Ft',
	icon: '$/ft²',
	description: 'Calculate price per square foot.',
	requiredInputs: [
		{
			name: 'purchasePrice',
			description: 'Property purchase price.',
			alternateNames: ['price']
		},
		{
			name: 'totalSquareFeet',
			description: 'Total square footage of the property.',
			alternateNames: ['squareFeet', 'sqft', 'area']
		}
	],
	formula: 'Price Per Sq Ft = purchasePrice / totalSquareFeet',
	execute: (input) => {
		if (typeof input === 'object' && input !== null) {
			const o = input as Record<string, unknown>;
			const price = (o.purchasePrice ?? o.price) as number || 0;
			const sqft = (o.totalSquareFeet ?? o.squareFeet ?? o.sqft ?? o.area) as number || 0;
			if (sqft > 0) {
				return '$' + (price / sqft).toFixed(2);
			}
		}
		return '$0.00';
	}
});
