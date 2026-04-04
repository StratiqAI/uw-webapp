import { WorkflowNode } from '../WorkflowNode';

export const calculateManagementFeeNode = new WorkflowNode({
	id: 'calculate-management-fee',
	type: 'process',
	label: 'Calculate Management Fee',
	icon: 'Mgmt$',
	description: 'Calculate property management fee based on gross operating income.',
	requiredInputs: [
		{
			name: 'grossOperatingIncome',
			description: 'Total gross operating income (before expenses).',
			alternateNames: ['grossIncome', 'grossRent']
		},
		{
			name: 'managementFeePercent',
			description: 'Management fee percentage (e.g., 5 for 5%).',
			alternateNames: ['managementFee', 'feePercent']
		}
	],
	formula: 'Management Fee = grossOperatingIncome × (managementFeePercent / 100)',
	execute: (input) => {
		if (typeof input === 'object' && input !== null) {
			const o = input as Record<string, unknown>;
			const grossIncome = (o.grossOperatingIncome ?? o.grossIncome ?? o.grossRent) as number || 0;
			const feePercent = (o.managementFeePercent ?? o.managementFee ?? o.feePercent) as number || 0;
			return (grossIncome * (feePercent / 100)).toFixed(2);
		}
		return '0.00';
	}
});
