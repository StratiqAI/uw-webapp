import { WorkflowNode } from '../WorkflowNode';

export const calculateVacancyRateNode = new WorkflowNode({
	id: 'calculate-vacancy-rate',
	type: 'process',
	label: 'Calculate Vacancy Rate',
	icon: 'Vac%',
	description: 'Calculate vacancy rate as a percentage of total units.',
	requiredInputs: [
		{
			name: 'vacantUnits',
			description: 'Number of vacant units.',
			alternateNames: ['vacant']
		},
		{
			name: 'totalUnits',
			description: 'Total number of units in the property.',
			alternateNames: ['units', 'unitCount']
		}
	],
	formula: 'Vacancy Rate = (vacantUnits / totalUnits) × 100%',
	execute: (input) => {
		if (typeof input === 'object' && input !== null) {
			const o = input as Record<string, unknown>;
			const vacant = (o.vacantUnits ?? o.vacant) as number || 0;
			const total = (o.totalUnits ?? o.units ?? o.unitCount) as number || 0;
			if (total > 0) {
				return ((vacant / total) * 100).toFixed(2) + '%';
			}
		}
		return '0%';
	}
});
