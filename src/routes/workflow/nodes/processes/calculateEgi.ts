import { WorkflowNode } from '../WorkflowNode';

export const calculateEgiNode = new WorkflowNode({
	id: 'calculate-egi',
	type: 'process',
	label: 'Calculate EGI',
	icon: 'EGI',
	description: 'Calculate Effective Gross Income (gross potential rent minus vacancy and collection losses).',
	requiredInputs: [
		{
			name: 'grossPotentialRent',
			description: 'Total gross potential rent if 100% occupied.',
			alternateNames: ['potentialRent', 'grossRent']
		},
		{
			name: 'vacancyLoss',
			description: 'Loss due to vacant units.',
			alternateNames: ['vacancy']
		},
		{
			name: 'collectionLoss',
			description: 'Loss due to uncollectible rent.',
			alternateNames: ['badDebt', 'collection']
		}
	],
	formula: 'EGI = grossPotentialRent − vacancyLoss − collectionLoss',
	execute: (input) => {
		if (typeof input === 'object' && input !== null) {
			const o = input as Record<string, unknown>;
			const potentialRent = (o.grossPotentialRent ?? o.potentialRent ?? o.grossRent) as number || 0;
			const vacancy = (o.vacancyLoss ?? o.vacancy) as number || 0;
			const collection = (o.collectionLoss ?? o.badDebt ?? o.collection) as number || 0;
			return (potentialRent - vacancy - collection).toFixed(2);
		}
		return '0.00';
	}
});
