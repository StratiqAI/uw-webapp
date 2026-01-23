import { WorkflowNode } from '../WorkflowNode';

export const calculateValueAddPotentialNode = new WorkflowNode({
	id: 'calculate-value-add-potential',
	type: 'process',
	label: 'Calculate Value Add Potential',
	icon: 'Value+',
	description: 'Calculate potential value increase from improving NOI (value-add opportunity).',
	requiredInputs: [
		{
			name: 'potentialNoi',
			description: 'Potential NOI after improvements.',
			alternateNames: ['improvedNoi', 'targetNoi']
		},
		{
			name: 'currentNoi',
			description: 'Current Net Operating Income.',
			alternateNames: ['noi', 'netOperatingIncome']
		},
		{
			name: 'capRate',
			description: 'Capitalization rate to use for valuation.',
			alternateNames: ['cap']
		}
	],
	formula: 'Value Add Potential = (potentialNoi − currentNoi) / capRate',
	execute: (input) => {
		if (typeof input === 'object' && input !== null) {
			const o = input as Record<string, unknown>;
			const potential = (o.potentialNoi ?? o.improvedNoi ?? o.targetNoi) as number || 0;
			const current = (o.currentNoi ?? o.noi ?? o.netOperatingIncome) as number || 0;
			const cap = (o.capRate ?? o.cap) as number || 0;
			if (cap > 0) {
				const valueAdd = (potential - current) / (cap / 100);
				return '$' + valueAdd.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
			}
		}
		return '$0';
	}
});
