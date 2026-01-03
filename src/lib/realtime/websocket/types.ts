/**
 * Interfaces for AppSync WebSocket Realtime Client.
 *
 */

import type { DocumentNode } from 'graphql';
import { print } from 'graphql';

// SubscribeOptions<T>: Options for subscribing to a GraphQL subscription.
//   - query: The GraphQL subscription document string or DocumentNode.
//   - variables: Optional variables for the subscription operation.
//   - next: Callback invoked with new data when received.
//   - error: Optional callback invoked on subscription errors.
export type SubscribeOptions<T = unknown> = {
	query: string | DocumentNode;
	variables?: Record<string, any>;
	next: (data: T) => void;
	error?: (e: any) => void;
};

// SubscribeOptions<T>: Options for subscribing to a GraphQL subscription.
//   - query: The GraphQL subscription document string.
//   - variables: Optional variables for the subscription operation.
//   - next: Callback invoked with new data when received.
//   - error: Optional callback invoked on subscription errors.
export type TAppSyncWsClient = {
	websocket: WebSocket;
	subscribe<T = unknown>(opts: SubscribeOptions<T>): { id: string; unsubscribe(): void };
	ready(): Promise<void>;
	addSubscription<T>(spec: SubscriptionSpec<T>): void;
	removeSubscription<T>(spec: SubscriptionSpec<T>): void;
	getSubscriptions(): SubscriptionSpec<any>[];
};

// AppSyncAuth: Describes the authentication method for AppSync WebSocket connections.
//   - 'apiKey': Uses an API key for authentication.
//   - 'cognito': Uses a Cognito ID token for authentication.
//   (Other modes can be added as needed.)
export type AppSyncAuth = { mode: 'apiKey'; apiKey: string } | { mode: 'cognito'; idToken: string };

// RealtimeClientOptions: Configuration for initializing the realtime WebSocket client.
//   - graphqlHttpUrl: The HTTP endpoint for the GraphQL API.
//   - auth: The authentication details (see AppSyncAuth).
//   - onEvent: Optional callback for raw WebSocket frames/events.

export interface RealtimeClientOptions {
	graphqlHttpUrl: string;
	auth: AppSyncAuth;
	onEvent?: (frame: unknown) => void;
}

// SubscriptionSpec<T>: Defines a single GraphQL subscription.
//   - query: The GraphQL subscription document string or DocumentNode.
//   - variables: Optional variables for the subscription.
//   - path: Optional dot-path to extract data from the payload.
//   - select: Optional custom function to extract/transform the payload.
//   - next: Handler for new data (after extraction).
//   - error: Optional error handler for subscription errors.
export interface SubscriptionSpec<T> {
	/** GraphQL subscription document (string or DocumentNode) */
	query: string | DocumentNode;
	/** Optional variables to pass with the subscription */
	variables?: Record<string, unknown>;
	/**
	 * Where to find the data in the payload, e.g. "onCreateUserItem".
	 * If provided, used as the default selector.
	 */
	path?: string;
	/**
	 * Custom selector to extract/shape the payload.
	 * If omitted, we use `path` (if provided) or pass the whole payload through.
	 */
	select?: (payload: any) => T | undefined;
	/** Handler for new data (after select/path extraction) */
	next: (data: T) => void;
	/** Optional error handler */
	error?: (e: unknown) => void;
}
