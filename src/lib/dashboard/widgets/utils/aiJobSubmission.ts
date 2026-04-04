import { createJobSubmissionClientWithAppSync } from '$lib/dashboard/services/jobManager';
import type { JobUpdate } from '$lib/dashboard/services/jobManager';

export interface JobSubmissionCallbacks {
	onJobComplete?: (update: JobUpdate) => void;
	onJobError?: (error: Error) => void;
	onStatusUpdate?: (update: JobUpdate) => void;
	onConnectionStateChange?: (state: string) => void;
}

export interface JobSubmissionConfig {
	maxRetries?: number;
	retryDelay?: number;
	reconnectBackoffMultiplier?: number;
	maxReconnectDelay?: number;
	subscriptionTimeout?: number;
}

/**
 * Advanced example of AI job submission with custom configuration
 * Creates a job submission client and submits a paragraph generation job
 * 
 * @param query - The query object to submit to the AI job system
 * @param idToken - User's authentication token
 * @param callbacks - Callback functions for job events
 * @param config - Optional configuration for the job submission client
 * @returns Promise with job submission result
 */
export async function submitAIJob(
	query: any,
	idToken: string,
	callbacks: JobSubmissionCallbacks,
	config?: JobSubmissionConfig
) {
	const defaultConfig: JobSubmissionConfig = {
		maxRetries: 5,
		retryDelay: 2000,
		reconnectBackoffMultiplier: 2,
		maxReconnectDelay: 60000,
		subscriptionTimeout: 300000 // 5 minutes
	};

	// Create a client with custom configuration (async)
	const client = await createJobSubmissionClientWithAppSync({
		config: { ...defaultConfig, ...config },
		callbacks
	});

	// Submit a job
	const result = await client.submitJob(query, idToken);

	return result;
}

