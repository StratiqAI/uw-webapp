import { WorkflowNode } from '../WorkflowNode';

export const calculateSimpleIrrNode = new WorkflowNode({
	id: 'calculate-simple-irr',
	type: 'process',
	label: 'Calculate Simple IRR',
	icon: 'IRR',
	description: 'Calculate a simplified Internal Rate of Return approximation from cash flows.',
	requiredInputs: [
		{
			name: 'cashFlows',
			description: 'Array of annual cash flows (first value is typically negative initial investment).',
			alternateNames: ['annualCashFlows']
		},
		{
			name: 'initialInvestment',
			description: 'Initial investment amount (typically negative).',
			alternateNames: ['initialCashFlow']
		}
	],
	formula: 'IRR ≈ (Average Annual Return / Initial Investment) × 100%',
	execute: (input) => {
		if (typeof input === 'object' && input !== null) {
			const o = input as Record<string, unknown>;
			const flows = (o.cashFlows ?? o.annualCashFlows) as number[] || [];
			const initial = (o.initialInvestment ?? o.initialCashFlow) as number || 0;
			
			if (flows.length > 0 && initial !== 0) {
				// Simple approximation: average return / initial investment
				const totalReturn = flows.reduce((sum, flow) => sum + (flow || 0), 0);
				const avgReturn = totalReturn / flows.length;
				const irr = (avgReturn / Math.abs(initial)) * 100;
				return irr.toFixed(2) + '%';
			}
		}
		return '0%';
	}
});
