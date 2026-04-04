import { WorkflowNode } from '../WorkflowNode';

export const calculatePricePerUnitNode = new WorkflowNode({
	id: 'calculate-price-per-unit',
	type: 'process',
	label: 'Calculate Price Per Unit',
	icon: '$/Unit',
	description: 'Calculate purchase price per unit.',
	requiredInputs: [
		{
			name: 'purchasePrice',
			description: 'Property purchase price.',
			alternateNames: ['price']
		},
		{
			name: 'numberOfUnits',
			description: 'Total number of units in the property.',
			alternateNames: ['units', 'unitCount']
		}
	],
	formula: 'Price Per Unit = purchasePrice / numberOfUnits',
	execute: (input) => {
		if (typeof input === 'object' && input !== null) {
			const o = input as Record<string, unknown>;
			const price = (o.purchasePrice ?? o.price) as number || 0;
			const units = (o.numberOfUnits ?? o.units ?? o.unitCount) as number || 0;
			if (units > 0) {
				return '$' + (price / units).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
			}
		}
		return '$0';
	}
});
