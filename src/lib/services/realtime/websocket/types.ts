/**
 * Interfaces for AppSync WebSocket Realtime Client.
 */

import type { DocumentNode } from 'graphql';

export type SubscribeOptions<T = unknown> = {
	query: string | DocumentNode;
	variables?: Record<string, any>;
	next: (data: T) => void;
	error?: (e: any) => void;
};

export type TAppSyncWsClient = {
	websocket: WebSocket | null;
	subscribe<T = unknown>(opts: SubscribeOptions<T>): { id: string; unsubscribe(): void };
	ready(): Promise<void>;
	addSubscription<T>(spec: SubscriptionSpec<T>): void;
	removeSubscription<T>(spec: SubscriptionSpec<T>): void;
	getSubscriptions(): SubscriptionSpec<any>[];
	disconnect(): void;
	registerOnReconnect(cb: () => void): () => void;
};

export type AppSyncAuth = { mode: 'apiKey'; apiKey: string } | { mode: 'cognito'; idToken: string };

export interface RealtimeClientOptions {
	graphqlHttpUrl: string;
	auth: AppSyncAuth;
	onEvent?: (frame: unknown) => void;
	/** Async token provider for reconnection (Cognito tokens expire ~60min). */
	getToken?: () => Promise<string>;
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

export interface ConnectionState {
	status: ConnectionStatus;
	lastConnectedAt: number | null;
	reconnectAttempt: number;
	error: string | null;
}

export interface SubscriptionSpec<T> {
	query: string | DocumentNode;
	variables?: Record<string, unknown>;
	path?: string;
	select?: (payload: any) => T | undefined;
	next: (data: T) => void;
	error?: (e: unknown) => void;
}
