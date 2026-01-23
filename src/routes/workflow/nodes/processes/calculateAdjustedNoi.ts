import { WorkflowNode } from '../WorkflowNode';

export const calculateAdjustedNoiNode = new WorkflowNode({
	id: 'calculate-adjusted-noi',
	type: 'process',
	label: 'Calculate Adjusted NOI',
	icon: 'NOI*',
	description: 'Calculate Net Operating Income after deducting capital reserves.',
	requiredInputs: [
		{
			name: 'noi',
			description: 'Net Operating Income (annual).',
			alternateNames: ['netOperatingIncome']
		},
		{
			name: 'capitalReserves',
			description: 'Annual capital reserves set aside for major repairs and replacements.',
			alternateNames: ['reserves', 'capExReserves']
		}
	],
	formula: 'Adjusted NOI = NOI − capitalReserves',
	execute: (input) => {
		if (typeof input === 'object' && input !== null) {
			const o = input as Record<string, unknown>;
			const noi = (o.noi ?? o.netOperatingIncome) as number || 0;
			const reserves = (o.capitalReserves ?? o.reserves ?? o.capExReserves) as number || 0;
			return (noi - reserves).toFixed(2);
		}
		return '0.00';
	}
});
