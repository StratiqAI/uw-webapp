import { WorkflowNode } from '../WorkflowNode';

export const calculateNoiPerSqftNode = new WorkflowNode({
	id: 'calculate-noi-per-sqft',
	type: 'process',
	label: 'Calculate NOI Per Sq Ft',
	icon: 'NOI/ft²',
	description: 'Calculate Net Operating Income per square foot.',
	requiredInputs: [
		{
			name: 'noi',
			description: 'Net Operating Income (annual).',
			alternateNames: ['netOperatingIncome']
		},
		{
			name: 'totalSquareFeet',
			description: 'Total square footage of the property.',
			alternateNames: ['squareFeet', 'sqft', 'area']
		}
	],
	formula: 'NOI Per Sq Ft = NOI / totalSquareFeet',
	execute: (input) => {
		if (typeof input === 'object' && input !== null) {
			const o = input as Record<string, unknown>;
			const noi = (o.noi ?? o.netOperatingIncome) as number || 0;
			const sqft = (o.totalSquareFeet ?? o.squareFeet ?? o.sqft ?? o.area) as number || 0;
			if (sqft > 0) {
				return '$' + (noi / sqft).toFixed(2);
			}
		}
		return '$0.00';
	}
});
