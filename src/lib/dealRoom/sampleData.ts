/**
 * Sample data for Deal Room demo. Used when "Populate with sample data" is clicked.
 */

import type {
	DealProject,
	NDAAgreement,
	Invitation,
	Question,
	Announcement,
	BuyerEngagement,
	MatchScore
} from './types';

export function getSampleData(projectId: string) {
	const now = new Date().toISOString();
	const project: DealProject = {
		id: projectId,
		name: 'Riverside Office Complex',
		description: 'Class A office asset in downtown with long-term tenants.',
		headline: 'Riverside Office Complex – 85% Leased',
		summary:
			'Prime 120,000 sq ft office building with strong in-place NOI. Recent capital improvements. Ideal for institutional or family office acquisition.',
		photoUrls: [
			'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800',
			'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800',
			'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800'
		],
		mapEmbedUrl: 'https://www.openstreetmap.org/export/embed.html?bbox=-0.1%2C51.5%2C0.1%2C51.51&layer=mapnik',
		brokerContactName: 'Jane Smith',
		brokerContactEmail: 'jane.smith@creadvisors.com',
		brokerContactPhone: '+1 (555) 123-4567',
		logoUrl: null,
		primaryColor: '#4F46E5',
		secondaryColor: '#7C3AED',
		dealTags: { sector: 'Office', region: 'Northeast', size: 'Mid-cap' },
		status: 'ACTIVE'
	};

	const ndaAgreements: NDAAgreement[] = [
		{
			id: 'sample-nda-1',
			parentId: projectId,
			ownerId: 'current-user',
			status: 'SIGNED',
			signedAt: now,
			createdAt: now,
			updatedAt: now
		},
		{
			id: 'sample-nda-2',
			parentId: projectId,
			ownerId: 'buyer-2',
			status: 'PENDING',
			createdAt: now,
			updatedAt: now
		}
	];

	const invitations: Invitation[] = [
		{ id: 'inv-1', parentId: projectId, email: 'alex.buyer@fund.com', status: 'SENT', role: 'BUYER', createdAt: now, updatedAt: now },
		{ id: 'inv-2', parentId: projectId, email: 'sarah.investor@capital.io', status: 'OPENED', role: 'BUYER', createdAt: now, updatedAt: now },
		{ id: 'inv-3', parentId: projectId, email: 'mike.lender@bank.com', status: 'REGISTERED', role: 'BUYER_LENDER', createdAt: now, updatedAt: now }
	];

	const questions: Question[] = [
		{
			id: 'q-1',
			parentId: projectId,
			authorId: 'user-1',
			questionText: 'What is the current WALT and are there any near-term lease expirations we should model?',
			isPublic: true,
			createdAt: now,
			updatedAt: now
		},
		{
			id: 'q-2',
			parentId: projectId,
			authorId: 'user-2',
			questionText: 'Has the roof been replaced in the last 10 years? We would like to review the last reserve study.',
			isPublic: true,
			createdAt: now,
			updatedAt: now
		},
		{
			id: 'q-3',
			parentId: projectId,
			authorId: 'user-1',
			questionText: 'Can we get access to the trailing 24-month utility bills?',
			isPublic: false,
			createdAt: now,
			updatedAt: now
		}
	];

	const announcements: Announcement[] = [
		{
			id: 'a-1',
			parentId: projectId,
			body: 'Data room is now live. Please complete the NDA before accessing documents. Q&A is open for all registered buyers.',
			createdAt: now,
			updatedAt: now
		},
		{
			id: 'a-2',
			parentId: projectId,
			body: 'Reminder: LOI deadline is Friday 5pm ET. Contact the broker with any process questions.',
			createdAt: now,
			updatedAt: now
		}
	];

	const engagements: BuyerEngagement[] = [
		{ dealId: projectId, userId: 'user-alex', documentViewCount: 24, downloadCount: 5, lastActiveAt: now },
		{ dealId: projectId, userId: 'user-sarah', documentViewCount: 18, downloadCount: 2, lastActiveAt: now },
		{ dealId: projectId, userId: 'user-mike', documentViewCount: 8, downloadCount: 1, lastActiveAt: now }
	];

	const matchScores: MatchScore[] = [
		{
			id: 'ms-1',
			parentId: projectId,
			investorProfileId: 'profile-1',
			score: 92,
			rationale: 'Strong fit: office focus, target size, and geographic preference align. Active in similar markets.',
			suggestedAction: 'Prioritize for LOI follow-up',
			createdAt: now
		},
		{
			id: 'ms-2',
			parentId: projectId,
			investorProfileId: 'profile-2',
			score: 87,
			rationale: 'Good match on sector and risk profile. Slightly lower on hold period preference.',
			suggestedAction: 'Include in next round',
			createdAt: now
		},
		{
			id: 'ms-3',
			parentId: projectId,
			investorProfileId: 'profile-3',
			score: 78,
			rationale: 'Relevant but typically targets smaller deals. May require co-investment structure.',
			suggestedAction: 'Optional outreach',
			createdAt: now
		}
	];

	return {
		project,
		ndaAgreements,
		invitations,
		questions,
		announcements,
		engagements,
		matchScores
	};
}

export type SampleData = ReturnType<typeof getSampleData>;
