import { WorkflowNode } from '../WorkflowNode';

export const calculateAnnualAppreciationNode = new WorkflowNode({
	id: 'calculate-annual-appreciation',
	type: 'process',
	label: 'Calculate Annual Appreciation',
	icon: 'Appr%',
	description: 'Calculate annual appreciation rate based on current value and purchase price over time.',
	requiredInputs: [
		{
			name: 'currentValue',
			description: 'Current property value.',
			alternateNames: ['value', 'appraisedValue']
		},
		{
			name: 'purchasePrice',
			description: 'Original purchase price.',
			alternateNames: ['price']
		},
		{
			name: 'yearsHeld',
			description: 'Number of years the property has been held.',
			alternateNames: ['years', 'holdingPeriod']
		}
	],
	formula: 'Annual Appreciation = ((currentValue − purchasePrice) / purchasePrice) / yearsHeld × 100%',
	execute: (input) => {
		if (typeof input === 'object' && input !== null) {
			const o = input as Record<string, unknown>;
			const current = (o.currentValue ?? o.value ?? o.appraisedValue) as number || 0;
			const purchase = (o.purchasePrice ?? o.price) as number || 0;
			const years = (o.yearsHeld ?? o.years ?? o.holdingPeriod) as number || 0;
			if (purchase > 0 && years > 0) {
				const appreciation = (((current - purchase) / purchase) / years) * 100;
				return appreciation.toFixed(2) + '%';
			}
		}
		return '0%';
	}
});
