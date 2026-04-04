/**
 * AppSync WebSocket Client Implementation (Hardened)
 *
 * This module provides a robust, secure, and memory-safe TypeScript implementation
 * of an AppSync WebSocket client for real-time GraphQL subscriptions.
 *
 * Security & Best Practices Features:
 * - Bounded message queue to prevent DoS via memory exhaustion.
 * - Explicit removal of WebSocket event listeners to prevent memory leaks.
 * - Thorough cleanup of timers and callback references on disconnect.
 * - Defensive error handling around network operations.
 * - Standardized WebSocket close codes.
 * - Readonly state where applicable.
 *
 * @author StratiqAI
 * @version 1.2.0 (Hardened)
 * @since 2024
 */

// Import only necessary utilities.
// Assuming logger handles environment-specific logging levels (e.g., no debug logs in prod).
import { logger } from '$lib/utils/debug';
import { print } from 'graphql';

// Websocket resources
import type {
	TAppSyncWsClient,
	RealtimeClientOptions,
	SubscriptionSpec,
	AppSyncAuth,
	SubscribeOptions
} from './types';

import { toRealtimeUrl, base64Url, safeJsonParse, uuid, pluck } from './utils';

// Constants for AppSync Protocol & Client Behavior
const APPSYNC_PROTOCOL = 'graphql-ws';
const DEFAULT_CONNECTION_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const KA_CHECK_INTERVAL_MS = 5000; // Check watchdog every 5 seconds
const MAX_QUEUE_SIZE = 1000; // Prevent memory exhaustion DoS if server floods data

// Standard WebSocket Close Codes
const WS_CLOSE_NORMAL = 1000;
const WS_CLOSE_POLICY_VIOLATION = 4008;
// const WS_CLOSE_INTERNAL_ERROR = 1011; // Unused but good reference

const MSG_TYPE = {
	CONNECTION_INIT: 'connection_init',
	CONNECTION_ACK: 'connection_ack',
	KA: 'ka',
	START: 'start',
	START_ACK: 'start_ack',
	DATA: 'data',
	ERROR: 'error',
	COMPLETE: 'complete',
	STOP: 'stop'
} as const;

// Internal interfaces for tighter typing
interface AppSyncMessage<T = any> {
	id?: string;
	type: (typeof MSG_TYPE)[keyof typeof MSG_TYPE];
	payload?: T;
}

interface SubscriptionRecord {
	next: (data: any) => void;
	error?: (e: any) => void;
}

interface ActiveSubscriptionHandle {
	unsubscribe: () => void;
}

export type AppSyncWsClientConfig = RealtimeClientOptions & {
	subscriptions?: SubscriptionSpec<any>[];
	/**
	 * Optional hook for monitoring raw incoming messages.
	 * SECURITY WARNING: Do not log these events blindly in production, as they
	 * may contain sensitive data or tokens in payloads.
	 */
	onEvent?: (frame: AppSyncMessage) => void;
};

export class AppSyncWsClient implements TAppSyncWsClient {
	public readonly websocket: WebSocket;
	private readonly httpHost: string;
	private readonly auth: AppSyncAuth;
	private readonly onEvent?: (frame: AppSyncMessage) => void;

	// Connection State
	private isAcked = false;
	private connectionTimeoutMs = DEFAULT_CONNECTION_TIMEOUT_MS;
	private lastKa = Date.now();
	private kaTimer: number | null = null;

	// Ready Promise State
	private readonly readyPromise: Promise<void>;
	private resolveReady!: () => void;
	private rejectReady!: (err: Error) => void;

	// Subscription State
	private readonly pendingStarts = new Map<string, AppSyncMessage>();
	private readonly activeSubscriptions = new Map<string, SubscriptionRecord>();
	// managed specs list is mutable as users can add/remove them
	private subscriptionSpecs: SubscriptionSpec<any>[] = [];
	private readonly specToHandleMap = new Map<SubscriptionSpec<any>, ActiveSubscriptionHandle>();

	// Message Queue State
	private queue: AppSyncMessage[] = [];
	private isFlushScheduled = false;

	// Bound Event Handlers (stored for proper removal to prevent memory leaks)
	private readonly handleOpenBound: () => void;
	private readonly handleMessageBound: (evt: MessageEvent) => void;
	private readonly handleCloseBound: (evt: CloseEvent) => void;

	constructor(options: AppSyncWsClientConfig) {
		// 1. Environment & Input Validation
		if (typeof window === 'undefined') {
			throw new Error('AppSync WS client must run in the browser environment.');
		}
		if (!options.graphqlHttpUrl) throw new Error('graphqlHttpUrl is required');
		if (!options.auth) throw new Error('auth configuration is required');

		const { graphqlHttpUrl, auth, onEvent, subscriptions } = options;

		this.auth = auth;
		this.onEvent = onEvent;
		this.subscriptionSpecs = subscriptions || [];

		// Pre-bind handlers once for correct add/removeEventListener usage
		this.handleOpenBound = this.onWsOpen.bind(this);
		this.handleMessageBound = this.onWsMessage.bind(this);
		this.handleCloseBound = this.onWsClose.bind(this);

		// 2. Connection Setup
		try {
			const httpUrl = new URL(graphqlHttpUrl);
			this.httpHost = httpUrl.host;
			const realtimeUrl = toRealtimeUrl(httpUrl);

			// Prepare initial handshake authentication header.
			// AppSync requires this specific (and somewhat dated) header encapsulation in the protocol URL.
			const headerSubproto = `header-${base64Url(JSON.stringify(this.getAuthHeaders()))}`;

			// Initialize WebSocket
			this.websocket = new WebSocket(realtimeUrl, [APPSYNC_PROTOCOL, headerSubproto]);
			this.websocket.binaryType = 'arraybuffer'; // Best practice, though AppSync uses text frames.
		} catch (e) {
			// Catch URL parsing errors or immediate WS creation failures
			throw new Error(`Failed to initialize AppSync WebSocket: ${(e as Error).message}`);
		}

		// Initialize ready promise
		this.readyPromise = new Promise<void>((res, rej) => {
			this.resolveReady = res;
			// If connection fails before ACK, this rejection is handled in onWsClose
			this.rejectReady = rej;
		});

		this.attachWebSocketEventListeners();
	}

	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	// Public API
	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-

	/**
	 * Returns a promise that resolves when the connection handshake (ack) is complete.
	 */
	public ready(): Promise<void> {
		return this.readyPromise;
	}

	/**
	 * Gracefully disconnects the WebSocket, sends a normal close code, and cleans up resources.
	 */
	public disconnect(): void {
		// Calling close() triggers the 'close' event listener, which calls cleanupConnection().
		// Using 1000 indicates a normal closure (e.g., user navigated away).
		if (
			this.websocket.readyState === WebSocket.OPEN ||
			this.websocket.readyState === WebSocket.CONNECTING
		) {
			this.websocket.close(WS_CLOSE_NORMAL, 'Client initiated disconnect');
		}
	}

	/**
	 * Adds a subscription specification to be managed by the client.
	 */
	public addSubscription<T>(spec: SubscriptionSpec<T>): void {
		// Prevent adding duplicate specs references
		if (this.subscriptionSpecs.includes(spec)) return;

		this.subscriptionSpecs.push(spec);

		if (this.isAcked) {
			this.setupManagedSubscription(spec);
		}
		// If not acked, it will be picked up in handleConnectionAck
	}

	/**
	 * Removes a managed subscription specification and unsubscribes from it.
	 */
	public removeSubscription<T>(spec: SubscriptionSpec<T>): void {
		const index = this.subscriptionSpecs.indexOf(spec);
		if (index > -1) {
			this.subscriptionSpecs.splice(index, 1);

			const handle = this.specToHandleMap.get(spec);
			if (handle) {
				handle.unsubscribe();
				this.specToHandleMap.delete(spec);
			}
		}
	}

	public getSubscriptions(): SubscriptionSpec<any>[] {
		// Return a shallow copy to prevent external mutation of the internal array
		return [...this.subscriptionSpecs];
	}

	/**
	 * Low-level subscription method.
	 * Returns a handle with an unsubscribe function.
	 */
	public subscribe<T = unknown>(params: SubscribeOptions<T>): { id: string; unsubscribe(): void } {
		const id = uuid();

		// Register the callback handlers
		this.activeSubscriptions.set(id, { next: params.next, error: params.error });

		let queryString: string;
		try {
			queryString = typeof params.query === 'string' ? params.query : print(params.query);
		} catch (e) {
			console.error('Failed to print GraphQL query AST', e);
			params.error?.(new Error('Invalid GraphQL Query'));
			return { id, unsubscribe: () => {} };
		}

		// AppSync expects auth headers in the extensions of the start message
		const frame: AppSyncMessage = {
			id,
			type: MSG_TYPE.START,
			payload: {
				data: JSON.stringify({
					query: queryString,
					variables: params.variables ?? {}
				}),
				extensions: { authorization: this.getAuthHeaders() }
			}
		};

		if (this.isAcked) {
			this.send(frame);
		} else {
			this.pendingStarts.set(id, frame);
		}

		// Return control handle
		return {
			id,
			unsubscribe: () => {
				// If it's pending and hasn't been sent yet, just remove it from the queue.
				const wasPending = this.pendingStarts.delete(id);
				if (!wasPending && this.isAcked) {
					// If it was already sent and we are connected, send a stop message.
					this.send({ type: MSG_TYPE.STOP, id });
				}
				// Remove local listeners immediately
				this.activeSubscriptions.delete(id);
			}
		};
	}

	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	// Internal: Connection Lifecycle & Event Handling
	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-

	private attachWebSocketEventListeners(): void {
		this.websocket.addEventListener('open', this.handleOpenBound);
		this.websocket.addEventListener('message', this.handleMessageBound);
		this.websocket.addEventListener('close', this.handleCloseBound);
		this.websocket.addEventListener('error', this.handleCloseBound); // Treat errors as closure triggers
	}

	private detachWebSocketEventListeners(): void {
		// CRITICAL: Remove listeners to prevent memory leaks in SPAs
		try {
			this.websocket.removeEventListener('open', this.handleOpenBound);
			this.websocket.removeEventListener('message', this.handleMessageBound);
			this.websocket.removeEventListener('close', this.handleCloseBound);
			this.websocket.removeEventListener('error', this.handleCloseBound);
		} catch (e) {
			// Ignore errors if WS is already invalid, just ensure cleanup attempts happen.
		}
	}

	private onWsOpen(): void {
		// Initiate AppSync handshake immediatly upon connection
		this.send({ type: MSG_TYPE.CONNECTION_INIT });
	}

	private onWsClose(evt: CloseEvent | Event): void {
		// Determine if this was a CloseEvent or just a generic Error event
		const code = 'code' in evt ? evt.code : 'N/A';
		const reason = 'reason' in evt ? evt.reason : 'Connection Error';

		if (!this.isAcked) {
			this.rejectReady(
				new Error(`WebSocket closed before connection_ack. Code: ${code}, Reason: ${reason}`)
			);
		}

		if (code !== WS_CLOSE_NORMAL) {
			logger(`AppSync WS closed unexpectedly. Code: ${code}`, reason);
		}

		this.cleanupConnection();
	}

	/**
	 * Centralized, idempotent cleanup routine for timers, listeners, and state.
	 * Ensures no memory leaks remain after connection termination.
	 */
	private cleanupConnection(): void {
		this.isAcked = false;
		this.detachWebSocketEventListeners();

		if (this.kaTimer !== null) {
			clearInterval(this.kaTimer);
			this.kaTimer = null;
		}

		// Clean up managed subscription handles
		for (const handle of this.specToHandleMap.values()) {
			// We don't call unsubscribe() here because that tries to send network messages.
			// We just need to ensure internal references are cleared.
		}
		this.specToHandleMap.clear();

		// CRITICAL: Clear all maps holding external callbacks to allow GC.
		this.activeSubscriptions.clear();
		this.pendingStarts.clear();
		this.queue = [];
		this.isFlushScheduled = false;
	}

	private onWsMessage(evt: MessageEvent): void {
		// Use safeJsonParse to prevent crashes from malformed server payloads
		const msg = safeJsonParse<AppSyncMessage>(String(evt.data));

		if (!msg || !msg.type) {
			logger('Received invalid or non-JSON message from AppSync protocol');
			return;
		}

		// Log non-keep-alive messages for debugging (assuming logger handles redaction in prod)
		if (msg.type !== MSG_TYPE.KA) {
			logger(`[${msg.type}]`, msg);
		}

		this.onEvent?.(msg);

		switch (msg.type) {
			case MSG_TYPE.CONNECTION_ACK:
				this.handleConnectionAck(msg);
				break;
			case MSG_TYPE.KA:
				this.lastKa = Date.now();
				break;
			case MSG_TYPE.DATA:
				this.handleDataMessage(msg);
				break;
			case MSG_TYPE.ERROR:
				this.handleErrorMessage(msg);
				break;
			case MSG_TYPE.COMPLETE:
				this.handleCompleteMessage(msg);
				break;
			// case MSG_TYPE.START_ACK:
			// Unused in standard flow, but could be handled here.
			// break;
		}
	}

	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	// Internal: Message Processors
	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-

	private handleConnectionAck(msg: AppSyncMessage<{ connectionTimeoutMs?: number }>): void {
		this.isAcked = true;
		// Allow server to override timeout, fallback to default.
		this.connectionTimeoutMs = msg.payload?.connectionTimeoutMs ?? DEFAULT_CONNECTION_TIMEOUT_MS;
		this.resolveReady();
		this.lastKa = Date.now();

		// Start Keep-Alive (KA) watchdog.
		// AppSync server sends KA periodically; client must ensure it receives them.
		if (this.kaTimer === null) {
			this.kaTimer = window.setInterval(() => {
				const timeSinceLastKa = Date.now() - this.lastKa;
				if (timeSinceLastKa > this.connectionTimeoutMs) {
					console.error('AppSync Keep-Alive timeout exceeded. Closing connection.');
					// 4008 = Policy Violation (server didn't respect KA policy)
					this.websocket.close(WS_CLOSE_POLICY_VIOLATION, 'KA Timeout');
				}
			}, KA_CHECK_INTERVAL_MS);
		}

		// Send any subscriptions that were queued before connection was ready
		for (const frame of this.pendingStarts.values()) {
			this.send(frame);
		}
		this.pendingStarts.clear();

		// Initialize managed subscriptions
		this.setupManagedSubscriptions();
	}

	private handleDataMessage(msg: AppSyncMessage): void {
		// DoS PREVENTION: Bounded queue.
		if (this.queue.length >= MAX_QUEUE_SIZE) {
			console.warn('AppSync client message queue full. Dropping incoming data message to prevent memory exhaustion.');
			// Optional: Could choose to disconnect here if flooding is severe.
			return;
		}

		this.queue.push(msg);
		this.scheduleFlush();
	}

	private handleErrorMessage(msg: AppSyncMessage): void {
		// Error can be connection-level (no id) or subscription-specific (has id)
		if (msg.id) {
			const sub = this.activeSubscriptions.get(msg.id);
			// Provide payload or entire msg if payload is missing
			sub?.error?.(msg.payload ?? msg);
		} else {
			// Global connection error. Log it.
			// Note: AppSync often sends connection errors just before closing the socket.
			console.error('AppSync Protocol Error:', msg.payload ?? msg);
		}
	}

	private handleCompleteMessage(msg: AppSyncMessage): void {
		// Server indicating subscription has finished sending data.
		if (msg.id) {
			this.activeSubscriptions.delete(msg.id);
		}
	}

	/**
	 * Schedules the microtask queue to flush data messages.
	 * Uses queueMicrotask to batch rapid incoming messages into a single processing tick.
	 */
	private scheduleFlush = () => {
		if (this.isFlushScheduled) return;
		this.isFlushScheduled = true;

		queueMicrotask(() => {
			try {
				for (const msg of this.queue) {
					if (msg.id && msg.payload) {
						const sub = this.activeSubscriptions.get(msg.id);
						sub?.next?.(msg.payload.data);
					}
				}
			} catch (e) {
				console.error('Error processing subscription data queue', e);
			} finally {
				// Always reset queue state even if processing failed
				this.queue = [];
				this.isFlushScheduled = false;
			}
		});
	};

	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
	// Internal: Utilities
	// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-

	/**
	 * Safely sends a message to the WebSocket.
	 */
	private send(obj: AppSyncMessage): boolean {
		if (this.websocket.readyState === WebSocket.OPEN) {
			try {
				this.websocket.send(JSON.stringify(obj));
				return true;
			} catch (e) {
				// Catch rare network stack errors during send even if readyState was OPEN
				console.error('Failed to send WebSocket message via network transport', e);
				// Force close if network transport is broken
				this.websocket.close(WS_CLOSE_POLICY_VIOLATION, 'Transport Error');
				return false;
			}
		} else {
			logger('Cannot send message, websocket is not OPEN.', obj.type, `ReadyState: ${this.websocket.readyState}`);
			return false;
		}
	}

	/**
	 * Generates the appropriate authentication header object based on the auth mode.
	 */
	private getAuthHeaders(): Record<string, string> {
		// Important: AppSync expects 'host' header for signature verification in some modes.
		const baseHeaders = { host: this.httpHost };
		if (this.auth.mode === 'apiKey') {
			return { ...baseHeaders, 'x-api-key': this.auth.apiKey };
		} else {
			// Assuming Cognito UserPools or OIDC or IAM where Authorization header is used.
			return { ...baseHeaders, Authorization: this.auth.idToken };
		}
	}

	/**
	 * Iterates through the declarative SubscriptionSpecs and sets them up.
	 */
	private setupManagedSubscriptions(): void {
		for (const spec of this.subscriptionSpecs) {
			// Avoid setting up duplicates if already active
			if (!this.specToHandleMap.has(spec)) {
				this.setupManagedSubscription(spec);
			}
		}
	}

	/**
	 * Converts a declarative SubscriptionSpec into an active subscription.
	 */
	private setupManagedSubscription<T>(spec: SubscriptionSpec<T>): void {
		logger('Setting up managed subscription:', spec);

		// Determine the data selector function
		let selector = (payload: any) => payload;
		if (spec.select) {
			selector = spec.select;
		} else if (spec.path) {
			selector = (payload: any) => pluck(payload, spec.path);
		}

		const handle = this.subscribe({
			query: spec.query,
			variables: spec.variables,
			next: (payload: any) => {
				// Wrap user-provided callbacks in try-catch to prevent app crashes
				try {
					const picked = selector(payload);
					// Only fire next if data was actually selected (avoids undefined updates)
					if (picked !== undefined) spec.next(picked);
				} catch (e) {
					const errorHandler = spec.error ?? console.error;
					errorHandler('Subscription selector error', e);
				}
			},
			error: spec.error ?? ((e) => console.error('Managed subscription error', e))
		});

		this.specToHandleMap.set(spec, handle);
	}
}

// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
// Singleton helpers
// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-

let appSyncWsClientSingleton: AppSyncWsClient | null = null;

/**
 * Returns the current singleton instance if it exists.
 */
export const getAppSyncWsClient = (): AppSyncWsClient | null => appSyncWsClientSingleton;

/**
 * Initializes the singleton if it doesn't exist, otherwise returns it.
 */
export const initAppSyncWsClient = (options: AppSyncWsClientConfig): AppSyncWsClient => {
	if (!appSyncWsClientSingleton) {
		appSyncWsClientSingleton = new AppSyncWsClient(options);
	} else if (options.subscriptions?.length) {
		for (const spec of options.subscriptions) {
			appSyncWsClientSingleton.addSubscription(spec);
		}
	}
	return appSyncWsClientSingleton;
};

/**
 * Disconnects and clears the singleton instance.
 */
export const destroyAppSyncWsClient = (): void => {
	if (appSyncWsClientSingleton) {
		appSyncWsClientSingleton.disconnect();
		appSyncWsClientSingleton = null;
	}
};