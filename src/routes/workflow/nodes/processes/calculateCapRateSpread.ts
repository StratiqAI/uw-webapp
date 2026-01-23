import { WorkflowNode } from '../WorkflowNode';

export const calculateCapRateSpreadNode = new WorkflowNode({
	id: 'calculate-cap-rate-spread',
	type: 'process',
	label: 'Calculate Cap Rate Spread',
	icon: 'CapΔ',
	description: 'Calculate the difference between property cap rate and market cap rate.',
	requiredInputs: [
		{
			name: 'propertyCapRate',
			description: 'Property capitalization rate.',
			alternateNames: ['capRate', 'propertyCap']
		},
		{
			name: 'marketCapRate',
			description: 'Market capitalization rate for comparable properties.',
			alternateNames: ['marketCap', 'comparableCapRate']
		}
	],
	formula: 'Cap Rate Spread = propertyCapRate − marketCapRate',
	execute: (input) => {
		if (typeof input === 'object' && input !== null) {
			const o = input as Record<string, unknown>;
			const propertyCap = (o.propertyCapRate ?? o.capRate ?? o.propertyCap) as number || 0;
			const marketCap = (o.marketCapRate ?? o.marketCap ?? o.comparableCapRate) as number || 0;
			const spread = propertyCap - marketCap;
			return spread.toFixed(2) + '%';
		}
		return '0%';
	}
});
