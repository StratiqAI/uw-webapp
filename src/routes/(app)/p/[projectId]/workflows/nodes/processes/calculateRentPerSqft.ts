import { WorkflowNode } from '../WorkflowNode';

export const calculateRentPerSqftNode = new WorkflowNode({
	id: 'calculate-rent-per-sqft',
	type: 'process',
	label: 'Calculate Rent Per Sq Ft',
	icon: 'R/ft²',
	description: 'Calculate annual rent per square foot.',
	requiredInputs: [
		{
			name: 'annualRent',
			description: 'Total annual rental income.',
			alternateNames: ['rent']
		},
		{
			name: 'totalSquareFeet',
			description: 'Total square footage of the property.',
			alternateNames: ['squareFeet', 'sqft', 'area']
		}
	],
	formula: 'Rent Per Sq Ft = annualRent / totalSquareFeet',
	execute: (input) => {
		if (typeof input === 'object' && input !== null) {
			const o = input as Record<string, unknown>;
			const rent = (o.annualRent ?? o.rent) as number || 0;
			const sqft = (o.totalSquareFeet ?? o.squareFeet ?? o.sqft ?? o.area) as number || 0;
			if (sqft > 0) {
				return '$' + (rent / sqft).toFixed(2);
			}
		}
		return '$0.00';
	}
});
