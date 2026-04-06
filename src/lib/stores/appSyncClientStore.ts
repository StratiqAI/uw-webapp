/**
 * Shared AppSync WebSocket Client Store
 * 
 * This module provides a singleton AppSyncWsClient instance that is shared across
 * all components in the application. This ensures efficient resource usage by:
 * - Maintaining a single WebSocket connection to AppSync
 * - Dynamically managing subscriptions as components mount/unmount
 * - Automatically handling connection lifecycle and reconnection
 * 
 * For comprehensive usage documentation, see:
 * @see {@link ../../../docs/application_stores/appSyncClientStore.md}
 * @see {@link ../../../docs/validated-topic-store.md#13-appsync-realtime-and-ontology-integration-planning} — wiring subscriptions into ValidatedTopicStore (ontology planning)
 */

import { AppSyncWsClient } from '$lib/services/realtime/websocket/AppSyncWsClient';
import { PUBLIC_GRAPHQL_HTTP_ENDPOINT } from '$env/static/public';
import type { SubscriptionSpec } from '$lib/services/realtime/websocket/types';
import { createLogger } from '$lib/utils/logger';

const log = createLogger('realtime');

interface ClientState {
	client: AppSyncWsClient | null;
	currentToken: string | null;
	isConnecting: boolean;
	connectionPromise: Promise<void> | null;
}

// Singleton state
const state: ClientState = {
	client: null,
	currentToken: null,
	isConnecting: false,
	connectionPromise: null
};

/**
 * Gets the current AppSyncWsClient instance, or null if not initialized
 */
export function getAppSyncClient(): AppSyncWsClient | null {
	return state.client;
}

/**
 * Ensures a connection is established with the given authentication token.
 * If a connection already exists with the same token, returns immediately.
 * If the token has changed, disconnects the old client and creates a new one.
 * 
 * @param idToken - The Cognito ID token for authentication
 * @returns Promise that resolves when the connection is ready
 */
export async function ensureConnection(idToken: string): Promise<AppSyncWsClient> {
	// If we're already connecting with the same token, wait for it
	if (state.isConnecting && state.currentToken === idToken && state.connectionPromise) {
		await state.connectionPromise;
		return state.client!;
	}

	// If we have a client with the same token, just return it
	if (state.client && state.currentToken === idToken) {
		return state.client;
	}

	// If token has changed, disconnect old client
	if (state.client && state.currentToken !== idToken) {
		log.info('Token changed, disconnecting old AppSync client');
		state.client.disconnect();
		state.client = null;
		state.currentToken = null;
	}

	// Create new connection
	state.isConnecting = true;
	state.currentToken = idToken;

	state.connectionPromise = (async () => {
		try {
			log.info('Creating shared AppSync WebSocket client');
			const client = new AppSyncWsClient({
				graphqlHttpUrl: PUBLIC_GRAPHQL_HTTP_ENDPOINT,
				auth: { mode: 'cognito', idToken },
				subscriptions: [] // Start with no subscriptions, components will add them
			});

			await client.ready();
			state.client = client;
			log.info('Shared AppSync client connected');
		} catch (error) {
			log.error('Failed to connect AppSync client:', error);
			state.client = null;
			state.currentToken = null;
			throw error;
		} finally {
			state.isConnecting = false;
			state.connectionPromise = null;
		}
	})();

	await state.connectionPromise;
	return state.client!;
}

/**
 * Adds a subscription to the shared client.
 * Ensures connection is established before adding the subscription.
 * 
 * @param idToken - The Cognito ID token for authentication
 * @param spec - The subscription specification
 * @returns Promise that resolves when the subscription is added
 */
export async function addSubscription<T>(
	idToken: string,
	spec: SubscriptionSpec<T>
): Promise<void> {
	const client = await ensureConnection(idToken);
	client.addSubscription(spec);
}

/**
 * Removes a subscription from the shared client.
 * 
 * @param spec - The subscription specification to remove
 */
export function removeSubscription<T>(spec: SubscriptionSpec<T>): void {
	if (state.client) {
		state.client.removeSubscription(spec);
	}
}

/**
 * Disconnects the shared client and cleans up all state.
 * Should typically only be called on app-level cleanup (e.g., logout).
 */
export function disconnectClient(): void {
	if (state.client) {
		log.info('Disconnecting shared AppSync client');
		state.client.disconnect();
		state.client = null;
		state.currentToken = null;
	}
}

/**
 * Returns the current connection state
 */
export function getConnectionState(): {
	isConnected: boolean;
	isConnecting: boolean;
	hasClient: boolean;
} {
	return {
		isConnected: state.client !== null && !state.isConnecting,
		isConnecting: state.isConnecting,
		hasClient: state.client !== null
	};
}

