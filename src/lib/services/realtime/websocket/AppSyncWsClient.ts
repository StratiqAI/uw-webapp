/**
 * AppSync WebSocket Client Implementation
 *
 * This module provides a TypeScript class-based implementation of an AppSync WebSocket client
 * for real-time GraphQL subscriptions. It handles the WebSocket connection lifecycle,
 * message routing, subscription management, and connection state tracking.
 *
 * Key Features:
 * - WebSocket connection management with automatic reconnection handling
 * - GraphQL subscription support with queuing for unready connections
 * - Keep-alive management and connection timeout handling
 * - Message type routing (connection_ack, ka, start_ack, data, error, complete)
 * - Authentication support for both API key and Cognito JWT tokens
 * - Promise-based connection ready state management
 *
 * Usage:
 * ```typescript
 * const client = createAppSyncWsClient({
 *   graphqlHttpUrl: 'https://your-appsync-endpoint.appsync-api.region.amazonaws.com/graphql',
 *   auth: { mode: 'cognito', idToken: 'your-jwt-token' }
 * });
 *
 * await client.ready(); // Wait for connection to be established
 *
 * const subscription = client.subscribe({
 *   query: 'subscription { onMessage { id content } }',
 *   next: (data) => console.log('Received:', data),
 *   error: (error) => console.error('Error:', error)
 * });
 *
 * // Later, unsubscribe
 * subscription.unsubscribe();
 * ```
 *
 * Architecture:
 * - AppSyncWsClientImpl: Main class implementing the WebSocket client
 * - Message handlers for each AppSync protocol message type
 * - Subscription queuing system for connections not yet ready
 * - Keep-alive watchdog for connection health monitoring
 *
 * Dependencies:
 * - WebSocket API (browser environment)
 * - AppSync GraphQL WebSocket protocol
 * - Cognito authentication tokens or API keys
 *
 * @author StratiqAI
 * @version 1.0.0
 * @since 2024
 */

// Import the public environment variables
import { PUBLIC_GRAPHQL_HTTP_ENDPOINT } from '$env/static/public';
import { logger } from '$lib/utils/debug';
import { print, type DocumentNode } from 'graphql';

// Websocket resources
import type {
	TAppSyncWsClient,
	RealtimeClientOptions,
	SubscriptionSpec,
	AppSyncAuth,
	SubscribeOptions
} from './types';

import { toRealtimeUrl, base64Url, safeJsonParse, uuid, pluck } from './utils';

export class AppSyncWsClient implements TAppSyncWsClient {
	public websocket: WebSocket;
	private isAcked = false;
	private pendingStarts = new Map<string, any>();
	private subs = new Map<string, { next: (data: any) => void; error?: (e: any) => void }>();
	private lastKa = Date.now();
	private connectionTimeoutMs = 5 * 60 * 1000;
	private kaTimer: number | null = null;
	private readyPromise: Promise<void>;
	private resolveReady!: () => void;
	private rejectReady!: (err: any) => void;
	private httpHost: string;
	private auth: AppSyncAuth;
	private onEvent?: (frame: any) => void;
	private subscriptionSpecs: SubscriptionSpec<any>[] = [];
	private subscriptionHandles: Array<{ unsubscribe: () => void }> = [];
	private specToHandleMap = new Map<SubscriptionSpec<any>, { unsubscribe: () => void }>();

	private queue: any[] = [];
	private scheduled = false;

	constructor(
		options:
			| {
					graphqlHttpUrl: string;
					auth: AppSyncAuth;
					onEvent?: (frame: any) => void;
					subscriptions?: SubscriptionSpec<any>[];
			  }
			| (RealtimeClientOptions & { subscriptions?: SubscriptionSpec<any>[] })
	) {
		// Only run on the client (not during SSR)
		if (typeof window === 'undefined') {
			throw new Error('AppSync WS client must run in the browser');
		}

		// Extract properties from the union type
		const { graphqlHttpUrl, auth, onEvent, subscriptions } = options as any;

		this.auth = auth;
		this.onEvent = onEvent;
		this.subscriptionSpecs = subscriptions || [];

		// Create URL objects for HTTP and WebSocket endpoints
		const httpUrl = new URL(graphqlHttpUrl);
		this.httpHost = httpUrl.host;
		const realtimeUrl = toRealtimeUrl(httpUrl);

		// Create header object for authentication
		const headerObj =
			this.auth.mode === 'apiKey'
				? { host: this.httpHost, 'x-api-key': this.auth.apiKey }
				: { host: this.httpHost, Authorization: this.auth.idToken };

		// Create header subprotocol
		const headerSubproto = `header-${base64Url(JSON.stringify(headerObj))}`;

		// Create WebSocket instance
		this.websocket = new WebSocket(realtimeUrl, ['graphql-ws', headerSubproto]);

		// Initialize the ready promise
		this.readyPromise = new Promise<void>((res, rej) => {
			this.resolveReady = res;
			this.rejectReady = rej;
		});

		this.setupWebSocketEventListeners();
	}

	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	// Ready State Management
	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-

	public ready(): Promise<void> {
		return this.readyPromise;
	}

	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	// Setup WebSocket Event Listeners
	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-

	// The websocket has 3 event listeners: open, message, error and close
	private setupWebSocketEventListeners(): void {
		// Add event listener for open event
		this.websocket.addEventListener('open', () => {
			this.send({ type: 'connection_init' });
		});

		// Add event listener for message event
		this.websocket.addEventListener('message', (evt) => {
			this.handleMessage(evt);
		});

		this.websocket.addEventListener('close', () => {
			this.handleClose();
		});
	}

	public disconnect(): void {
		// Clean up subscriptions
		for (const h of this.subscriptionHandles) {
			h.unsubscribe?.();
		}
		this.subscriptionHandles = [];
		this.specToHandleMap.clear();

		if (this.kaTimer != null) {
			clearInterval(this.kaTimer);
			this.kaTimer = null;
		}
		try {
			this.websocket?.close?.();
		} catch {}
	}

	private handleClose(): void {
		if (!this.isAcked) this.rejectReady(new Error('Socket closed before connection_ack'));
		this.isAcked = false;

		// Stop the keep-alive timer
		if (this.kaTimer != null) {
			clearInterval(this.kaTimer);
			this.kaTimer = null;
		}
	}

	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	// WebSocket Message Dispatching Handlers
	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-

	private handleMessage(evt: MessageEvent): void {
		// Parse the message
		const msg = safeJsonParse(String(evt.data));

		// If the message is not valid, return
		if (!msg) return;

		// Log the message
		if (msg.type != 'ka') {
			logger(`msg ${msg.type}`, msg);
		}

		// Call the onEvent callback
		this.onEvent?.(msg);

		// Handle different message types
		switch (msg.type) {
			case 'connection_ack':
				this.handleConnectionAck(msg);
				break;
			case 'ka':
				this.handleKeepAlive();
				break;
			case 'start_ack':
				this.handleStartAck();
				break;
			case 'data':
				this.queue.push(msg);
				this.scheduleFlush();
				break;
			case 'error':
				this.handleError(msg);
				break;
			case 'complete':
				this.handleComplete(msg);
				break;
		}
	}

	private scheduleFlush = () => {
		if (this.scheduled) return;
		this.scheduled = true;
		queueMicrotask(() => {
			for (const msg of this.queue) this.handleData(msg);
			this.queue = [];
			this.scheduled = false;
		});
	};

	private handleConnectionAck(msg: any): void {
		this.isAcked = true;
		this.connectionTimeoutMs = msg?.payload?.connectionTimeoutMs ?? this.connectionTimeoutMs;
		this.resolveReady();

		// start KA watchdog
		if (this.kaTimer == null) {
			this.kaTimer = window.setInterval(
				() => {
					if (Date.now() - this.lastKa > this.connectionTimeoutMs) {
						try {
							this.websocket.close(4000, 'KA timeout');
						} catch {}
					}
				},
				Math.max(1000, Math.floor(this.connectionTimeoutMs / 4))
			);
		}

		// flush queued subscriptions
		for (const [, frame] of this.pendingStarts) this.send(frame);
		this.pendingStarts.clear();

		// Set up subscriptions once connection is ready
		this.setupSubscriptions();
	}

	private handleKeepAlive(): void {
		this.lastKa = Date.now();
	}

	private handleStartAck(): void {
		// nothing to do
	}

	private handleData(msg: any): void {
		const sub = this.subs.get(msg.id);
		sub?.next?.(msg.payload?.data);
	}

	private handleError(msg: any): void {
		// per-subscription error (has id) or connection-level error (no id)
		const sub = msg.id ? this.subs.get(msg.id) : undefined;
		if (sub?.error) sub.error(msg.payload ?? msg);
		else console.error('AppSync WS error', msg.payload ?? msg);
	}

	private handleComplete(msg: any): void {
		this.subs.delete(msg.id);
	}

	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	// Send Message to the WebSocket
	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-

	private send(obj: any): boolean {
		if (this.websocket.readyState === WebSocket.OPEN) {
			this.websocket.send(JSON.stringify(obj));
			return true;
		}
		return false;
	}

	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	// Subscriptions Management
	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-

	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	// Create Subscriptions

	public addSubscription<T>(spec: SubscriptionSpec<T>): void {
		this.subscriptionSpecs.push(spec);

		// If already connected, set up the subscription immediately
		if (this.isAcked) {
			this.setupSubscription(spec);
		}
	}

	private async setupSubscriptions(): Promise<void> {
		for (const spec of this.subscriptionSpecs) {
			this.setupSubscription(spec);
		}
	}

	private setupSubscription<T>(spec: SubscriptionSpec<T>): void {
		logger('Setting up subscription ---------------------->: ', spec);
		const selector =
			spec.select ?? (spec.path ? (payload: any) => pluck(payload, spec.path) : (payload: any) => payload);

		const h = this.subscribe({
			query: spec.query,
			variables: spec.variables,
			next: (payload: any) => {
				try {
					const picked = selector(payload);
					if (picked !== undefined) spec.next(picked);
				} catch (e) {
					(spec.error ?? console.error)('selector error', e);
				}
			},
			error: spec.error ?? ((e: unknown) => console.error('subscription error', e))
		});

		this.subscriptionHandles.push(h);
		this.specToHandleMap.set(spec, h);
	}

	public subscribe<T = unknown>(params: SubscribeOptions<T>): { id: string; unsubscribe(): void } {
		const id = uuid();

		this.subs.set(id, { next: params.next, error: params.error });

		const authExt =
			this.auth.mode === 'apiKey'
				? { 'x-api-key': (this.auth as any).apiKey, host: this.httpHost }
				: { Authorization: (this.auth as any).idToken, host: this.httpHost };

		// Convert DocumentNode to string if needed
		const queryString = typeof params.query === 'string' ? params.query : print(params.query);

		const frame = {
			id,
			type: 'start',
			payload: {
				data: JSON.stringify({
					query: queryString,
					variables: params.variables ?? {}
				}),
				extensions: { authorization: authExt }
			}
		};

		if (this.isAcked) this.send(frame);
		else this.pendingStarts.set(id, frame);

		return {
			id,
			unsubscribe: () => {
				this.pendingStarts.delete(id); // if it never flushed, drop it
				this.send({ type: 'stop', id });
				this.subs.delete(id);
			}
		};
	}

	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	// Remove Subscriptions
	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-

	public removeSubscription<T>(spec: SubscriptionSpec<T>): void {
		const index = this.subscriptionSpecs.indexOf(spec);
		if (index > -1) {
			this.subscriptionSpecs.splice(index, 1);

			// Get the handle and unsubscribe
			const handle = this.specToHandleMap.get(spec);
			if (handle) {
				handle.unsubscribe();
				this.specToHandleMap.delete(spec);

				// Remove from handles array
				const handleIndex = this.subscriptionHandles.indexOf(handle);
				if (handleIndex > -1) {
					this.subscriptionHandles.splice(handleIndex, 1);
				}
			}
		}
	}

	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	// Get Subscriptions
	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	public getSubscriptions(): SubscriptionSpec<any>[] {
		return [...this.subscriptionSpecs];
	}
}
