import { WorkflowNode } from '../WorkflowNode';

export const calculateRentPerUnitNode = new WorkflowNode({
	id: 'calculate-rent-per-unit',
	type: 'process',
	label: 'Calculate Rent Per Unit',
	icon: 'R/Unit',
	description: 'Calculate annual rent per unit.',
	requiredInputs: [
		{
			name: 'annualRent',
			description: 'Total annual rental income.',
			alternateNames: ['rent']
		},
		{
			name: 'numberOfUnits',
			description: 'Total number of units in the property.',
			alternateNames: ['units', 'unitCount']
		}
	],
	formula: 'Rent Per Unit = annualRent / numberOfUnits',
	execute: (input) => {
		if (typeof input === 'object' && input !== null) {
			const o = input as Record<string, unknown>;
			const rent = (o.annualRent ?? o.rent) as number || 0;
			const units = (o.numberOfUnits ?? o.units ?? o.unitCount) as number || 0;
			if (units > 0) {
				return '$' + (rent / units).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
			}
		}
		return '$0';
	}
});
