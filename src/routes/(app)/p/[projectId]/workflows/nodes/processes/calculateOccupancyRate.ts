import { WorkflowNode } from '../WorkflowNode';

export const calculateOccupancyRateNode = new WorkflowNode({
	id: 'calculate-occupancy-rate',
	type: 'process',
	label: 'Calculate Occupancy Rate',
	icon: 'Occ%',
	description: 'Calculate occupancy rate as a percentage of total units.',
	requiredInputs: [
		{
			name: 'occupiedUnits',
			description: 'Number of occupied units.',
			alternateNames: ['occupied']
		},
		{
			name: 'totalUnits',
			description: 'Total number of units in the property.',
			alternateNames: ['units', 'unitCount']
		}
	],
	formula: 'Occupancy Rate = (occupiedUnits / totalUnits) × 100%',
	execute: (input) => {
		if (typeof input === 'object' && input !== null) {
			const o = input as Record<string, unknown>;
			const occupied = (o.occupiedUnits ?? o.occupied) as number || 0;
			const total = (o.totalUnits ?? o.units ?? o.unitCount) as number || 0;
			if (total > 0) {
				return ((occupied / total) * 100).toFixed(2) + '%';
			}
		}
		return '0%';
	}
});
