import { WorkflowNode } from '../WorkflowNode';

export const calculateYieldOnCostNode = new WorkflowNode({
	id: 'calculate-yield-on-cost',
	type: 'process',
	label: 'Calculate Yield on Cost',
	icon: 'YoC',
	description: 'Calculate yield on cost (NOI divided by total project cost).',
	requiredInputs: [
		{
			name: 'noi',
			description: 'Net Operating Income (annual).',
			alternateNames: ['netOperatingIncome']
		},
		{
			name: 'totalProjectCost',
			description: 'Total project cost including acquisition and improvements.',
			alternateNames: ['projectCost', 'totalCost']
		}
	],
	formula: 'Yield on Cost = NOI / totalProjectCost',
	execute: (input) => {
		if (typeof input === 'object' && input !== null) {
			const o = input as Record<string, unknown>;
			const noi = (o.noi ?? o.netOperatingIncome) as number || 0;
			const cost = (o.totalProjectCost ?? o.projectCost ?? o.totalCost) as number || 0;
			if (cost > 0) {
				return ((noi / cost) * 100).toFixed(2) + '%';
			}
		}
		return '0%';
	}
});
