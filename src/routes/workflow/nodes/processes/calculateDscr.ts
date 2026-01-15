import { WorkflowNode } from '../WorkflowNode';

export const calculateDscrNode = new WorkflowNode({
	id: 'process-calculate-dscr',
	type: 'process',
	label: 'Calculate DSCR',
	icon: 'DSCR',
	execute: (input) => {
		if (typeof input === 'object' && input !== null) {
			const noi = input.noi || input.netOperatingIncome || 0;
			const debtService = input.debtService || input.monthlyPayment || 0;
			if (debtService > 0) {
				return (noi / (debtService * 12)).toFixed(2);
			}
		}
		return '0.00';
	}
});
