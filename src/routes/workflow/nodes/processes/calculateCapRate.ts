import { WorkflowNode } from '../WorkflowNode';

export const calculateCapRateNode = new WorkflowNode({
	id: 'calculate-cap-rate',
	type: 'process',
	label: 'Calculate Cap Rate',
	icon: '%',
	description: 'Calculate capitalization rate from NOI and purchase price.',
	execute: (input) => {
		if (typeof input === 'object' && input !== null) {
			const noi = input.noi || input.netOperatingIncome || 0;
			const price = input.purchasePrice || input.price || 0;
			if (price > 0) {
				return ((noi / price) * 100).toFixed(2) + '%';
			}
		}
		return '0%';
	}
});
