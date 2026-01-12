// Insight type based on GraphQL subscription
export interface Insight {
	category: string;
	confidence: number;
	createdAt: string;
	docHash: string;
	hash: string;
	imageId?: string;
	model: string;
	name: string;
	pageId?: string;
	textId?: string;
	type: string;
	value: string;
}

// Subscription response wrapper
export interface InsightSubscriptionResponse {
	onCreateInsight: Insight;
}
