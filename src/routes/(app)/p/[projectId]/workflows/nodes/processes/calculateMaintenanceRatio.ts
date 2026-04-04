import { WorkflowNode } from '../WorkflowNode';

export const calculateMaintenanceRatioNode = new WorkflowNode({
	id: 'calculate-maintenance-ratio',
	type: 'process',
	label: 'Calculate Maintenance Ratio',
	icon: 'Maint%',
	description: 'Calculate maintenance expense ratio as a percentage of gross operating income.',
	requiredInputs: [
		{
			name: 'maintenanceExpenses',
			description: 'Total annual maintenance expenses.',
			alternateNames: ['maintenance', 'repairs']
		},
		{
			name: 'grossOperatingIncome',
			description: 'Total gross operating income (before expenses).',
			alternateNames: ['grossIncome', 'grossRent']
		}
	],
	formula: 'Maintenance Ratio = (maintenanceExpenses / grossOperatingIncome) × 100%',
	execute: (input) => {
		if (typeof input === 'object' && input !== null) {
			const o = input as Record<string, unknown>;
			const maintenance = (o.maintenanceExpenses ?? o.maintenance ?? o.repairs) as number || 0;
			const grossIncome = (o.grossOperatingIncome ?? o.grossIncome ?? o.grossRent) as number || 0;
			if (grossIncome > 0) {
				return ((maintenance / grossIncome) * 100).toFixed(2) + '%';
			}
		}
		return '0%';
	}
});
