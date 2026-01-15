import { WorkflowNode } from '../WorkflowNode';

export const calculateCashFlowNode = new WorkflowNode({
	id: 'process-calculate-cash-flow',
	type: 'process',
	label: 'Calculate Cash Flow',
	icon: 'CF',
	execute: (input) => {
		if (typeof input === 'object' && input !== null) {
			const noi = input.noi || input.netOperatingIncome || 0;
			const debtService = input.debtService || input.monthlyPayment || 0;
			return noi - (debtService * 12);
		}
		return 0;
	}
});
