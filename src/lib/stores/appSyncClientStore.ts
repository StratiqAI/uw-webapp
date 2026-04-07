/**
 * Shared AppSync WebSocket Client Store
 *
 * Thin facade over the unified wsClient.ts singleton.
 * Preserves the public API for existing consumers while delegating
 * to the single hardened AppSyncWsClient instance.
 */

import { PUBLIC_GRAPHQL_HTTP_ENDPOINT } from '$env/static/public';
import type { SubscriptionSpec } from '$lib/services/realtime/websocket/types';
import {
	initAppSyncWsClient,
	getAppSyncWsClient,
	destroyAppSyncWsClient,
	type AppSyncWsClient
} from '$lib/services/realtime/websocket/wsClient';
import { connectionState } from '$lib/services/realtime/websocket/connectionState.svelte';
import { createLogger } from '$lib/utils/logger';

const log = createLogger('realtime');

let currentToken: string | null = null;
let connectionPromise: Promise<void> | null = null;

export function getAppSyncClient(): AppSyncWsClient | null {
	return getAppSyncWsClient();
}

export async function ensureConnection(idToken: string): Promise<AppSyncWsClient> {
	const existing = getAppSyncWsClient();

	if (existing && currentToken === idToken) {
		return existing;
	}

	if (connectionPromise && currentToken === idToken) {
		await connectionPromise;
		return getAppSyncWsClient()!;
	}

	if (existing && currentToken !== idToken) {
		log.info('Token changed, destroying old AppSync client');
		destroyAppSyncWsClient();
		currentToken = null;
	}

	currentToken = idToken;

	connectionPromise = (async () => {
		try {
			log.info('Creating shared AppSync WebSocket client via unified singleton');
			const client = initAppSyncWsClient({
				graphqlHttpUrl: PUBLIC_GRAPHQL_HTTP_ENDPOINT,
				auth: { mode: 'cognito', idToken },
				getToken: async () => idToken
			});
			await client.ready();
			log.info('Shared AppSync client connected');
		} catch (error) {
			log.error('Failed to connect AppSync client:', error);
			currentToken = null;
			throw error;
		} finally {
			connectionPromise = null;
		}
	})();

	await connectionPromise;
	return getAppSyncWsClient()!;
}

export async function addSubscription<T>(
	idToken: string,
	spec: SubscriptionSpec<T>
): Promise<void> {
	const client = await ensureConnection(idToken);
	client.addSubscription(spec);
}

export function removeSubscription<T>(spec: SubscriptionSpec<T>): void {
	const client = getAppSyncWsClient();
	if (client) {
		client.removeSubscription(spec);
	}
}

export function disconnectClient(): void {
	log.info('Disconnecting shared AppSync client');
	destroyAppSyncWsClient();
	currentToken = null;
}

export function getConnectionState(): {
	isConnected: boolean;
	isConnecting: boolean;
	hasClient: boolean;
} {
	return {
		isConnected: connectionState.status === 'connected',
		isConnecting: connectionState.status === 'connecting' || connectionState.status === 'reconnecting',
		hasClient: getAppSyncWsClient() !== null
	};
}
