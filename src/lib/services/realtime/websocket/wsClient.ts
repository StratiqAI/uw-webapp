/**
 * AppSync WebSocket Client — Unified, Hardened, Auto-Reconnecting
 *
 * Single source of truth for all AppSync realtime subscriptions in the app.
 *
 * Features:
 * - Exponential backoff reconnect (1s → 2s → 4s … 30s cap)
 * - Subscription restoration after reconnect
 * - Observable connection state (importable reactive object)
 * - Token refresh via async getToken() hook
 * - Bounded message queue (DoS guard)
 * - Proper listener cleanup to prevent SPA memory leaks
 * - onReconnect callback registry for sync-manager refetch
 */

import { createLogger } from '$lib/utils/logger';

const log = createLogger('realtime');
import { print } from 'graphql';

import type {
	TAppSyncWsClient,
	RealtimeClientOptions,
	SubscriptionSpec,
	AppSyncAuth,
	SubscribeOptions,
	ConnectionState
} from './types';

import { toRealtimeUrl, base64Url, safeJsonParse, uuid, pluck } from './utils';
import { setConnectionState, resetConnectionState } from './connectionState.svelte';

// ── Protocol constants ──────────────────────────────────────────────

const APPSYNC_PROTOCOL = 'graphql-ws';
const DEFAULT_CONNECTION_TIMEOUT_MS = 5 * 60 * 1000;
const KA_CHECK_INTERVAL_MS = 5000;
const MAX_QUEUE_SIZE = 1000;

const WS_CLOSE_NORMAL = 1000;
const WS_CLOSE_POLICY_VIOLATION = 4008;

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

// ── Reconnect constants ─────────────────────────────────────────────

const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 30_000;
const RECONNECT_MAX_ATTEMPTS = Infinity;

// ── Internal types ──────────────────────────────────────────────────

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

// ── Config type ─────────────────────────────────────────────────────

export type AppSyncWsClientConfig = RealtimeClientOptions & {
	subscriptions?: SubscriptionSpec<any>[];
	onEvent?: (frame: AppSyncMessage) => void;
};

// ── Client class ────────────────────────────────────────────────────

export class AppSyncWsClient implements TAppSyncWsClient {
	public websocket: WebSocket | null = null;
	private readonly graphqlHttpUrl: string;
	private readonly httpHost: string;
	private auth: AppSyncAuth;
	private readonly onEvent?: (frame: AppSyncMessage) => void;
	private readonly getToken?: () => Promise<string>;

	// Connection state
	private isAcked = false;
	private connectionTimeoutMs = DEFAULT_CONNECTION_TIMEOUT_MS;
	private lastKa = Date.now();
	private kaTimer: number | null = null;

	// Ready promise
	private readyPromise!: Promise<void>;
	private resolveReady!: () => void;
	private rejectReady!: (err: Error) => void;

	// Subscriptions
	private readonly pendingStarts = new Map<string, AppSyncMessage>();
	private readonly activeSubscriptions = new Map<string, SubscriptionRecord>();
	private subscriptionSpecs: SubscriptionSpec<any>[] = [];
	private readonly specToHandleMap = new Map<SubscriptionSpec<any>, ActiveSubscriptionHandle>();

	// Message queue
	private queue: AppSyncMessage[] = [];
	private isFlushScheduled = false;

	// Reconnect
	private intentionalClose = false;
	private reconnectAttempt = 0;
	private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
	private readonly onReconnectCallbacks = new Set<() => void>();

	// Bound handlers
	private handleOpenBound!: () => void;
	private handleMessageBound!: (evt: MessageEvent) => void;
	private handleCloseBound!: (evt: CloseEvent | Event) => void;

	constructor(private readonly config: AppSyncWsClientConfig) {
		if (typeof window === 'undefined') {
			throw new Error('AppSync WS client must run in the browser environment.');
		}
		if (!config.graphqlHttpUrl) throw new Error('graphqlHttpUrl is required');
		if (!config.auth) throw new Error('auth configuration is required');

		this.graphqlHttpUrl = config.graphqlHttpUrl;
		this.auth = config.auth;
		this.onEvent = config.onEvent;
		this.getToken = config.getToken;
		this.subscriptionSpecs = config.subscriptions ? [...config.subscriptions] : [];

		const httpUrl = new URL(config.graphqlHttpUrl);
		this.httpHost = httpUrl.host;

		this.resetReadyPromise();
		this.connect();
	}

	// ── Public API ────────────────────────────────────────────────────

	public ready(): Promise<void> {
		return this.readyPromise;
	}

	public disconnect(): void {
		this.intentionalClose = true;
		this.cancelReconnect();

		if (
			this.websocket &&
			(this.websocket.readyState === WebSocket.OPEN ||
				this.websocket.readyState === WebSocket.CONNECTING)
		) {
			this.websocket.close(WS_CLOSE_NORMAL, 'Client initiated disconnect');
		}
		this.cleanupConnection();
		setConnectionState({ status: 'disconnected', error: null, reconnectAttempt: 0 });
	}

	public addSubscription<T>(spec: SubscriptionSpec<T>): void {
		if (this.subscriptionSpecs.includes(spec)) return;
		this.subscriptionSpecs.push(spec);

		if (this.isAcked) {
			this.setupManagedSubscription(spec);
		}
	}

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
		return [...this.subscriptionSpecs];
	}

	public subscribe<T = unknown>(params: SubscribeOptions<T>): { id: string; unsubscribe(): void } {
		const id = uuid();
		this.activeSubscriptions.set(id, { next: params.next, error: params.error });

		let queryString: string;
		try {
			queryString = typeof params.query === 'string' ? params.query : print(params.query);
		} catch (e) {
			log.error('Failed to print GraphQL query AST', e);
			params.error?.(new Error('Invalid GraphQL Query'));
			return { id, unsubscribe: () => {} };
		}

		const frame: AppSyncMessage = {
			id,
			type: MSG_TYPE.START,
			payload: {
				data: JSON.stringify({ query: queryString, variables: params.variables ?? {} }),
				extensions: { authorization: this.getAuthHeaders() }
			}
		};

		if (this.isAcked) {
			this.send(frame);
		} else {
			this.pendingStarts.set(id, frame);
		}

		return {
			id,
			unsubscribe: () => {
				const wasPending = this.pendingStarts.delete(id);
				if (!wasPending && this.isAcked) {
					this.send({ type: MSG_TYPE.STOP, id });
				}
				this.activeSubscriptions.delete(id);
			}
		};
	}

	/**
	 * Register a callback to be invoked after a successful reconnect + ack.
	 * Returns a cleanup function to unregister.
	 */
	public registerOnReconnect(cb: () => void): () => void {
		this.onReconnectCallbacks.add(cb);
		return () => {
			this.onReconnectCallbacks.delete(cb);
		};
	}

	// ── Connection lifecycle ──────────────────────────────────────────

	private connect(): void {
		try {
			setConnectionState({
				status: this.reconnectAttempt > 0 ? 'reconnecting' : 'connecting',
				reconnectAttempt: this.reconnectAttempt,
				error: null
			});

			const httpUrl = new URL(this.graphqlHttpUrl);
			const realtimeUrl = toRealtimeUrl(httpUrl);
			const headerSubproto = `header-${base64Url(JSON.stringify(this.getAuthHeaders()))}`;

			this.websocket = new WebSocket(realtimeUrl, [APPSYNC_PROTOCOL, headerSubproto]);
			this.websocket.binaryType = 'arraybuffer';

			this.handleOpenBound = this.onWsOpen.bind(this);
			this.handleMessageBound = this.onWsMessage.bind(this);
			this.handleCloseBound = this.onWsClose.bind(this);

			this.websocket.addEventListener('open', this.handleOpenBound);
			this.websocket.addEventListener('message', this.handleMessageBound);
			this.websocket.addEventListener('close', this.handleCloseBound);
			this.websocket.addEventListener('error', this.handleCloseBound);
		} catch (e) {
			const msg = `Failed to initialize AppSync WebSocket: ${(e as Error).message}`;
			log.error(msg);
			setConnectionState({ status: 'disconnected', error: msg });
			this.scheduleReconnect();
		}
	}

	private resetReadyPromise(): void {
		this.readyPromise = new Promise<void>((res, rej) => {
			this.resolveReady = res;
			this.rejectReady = rej;
		});
	}

	private detachWebSocketEventListeners(): void {
		if (!this.websocket) return;
		try {
			this.websocket.removeEventListener('open', this.handleOpenBound);
			this.websocket.removeEventListener('message', this.handleMessageBound);
			this.websocket.removeEventListener('close', this.handleCloseBound);
			this.websocket.removeEventListener('error', this.handleCloseBound);
		} catch {
			// WS may already be invalid
		}
	}

	private onWsOpen(): void {
		this.send({ type: MSG_TYPE.CONNECTION_INIT });
	}

	private onWsClose(evt: CloseEvent | Event): void {
		const code = 'code' in evt ? evt.code : 'N/A';
		const reason = 'reason' in evt ? evt.reason : 'Connection Error';
		const wasAcked = this.isAcked;

		if (!wasAcked) {
			this.rejectReady(
				new Error(`WebSocket closed before connection_ack. Code: ${code}, Reason: ${reason}`)
			);
		}

		if (code !== WS_CLOSE_NORMAL) {
			log.debug(`AppSync WS closed unexpectedly. Code: ${code}`, reason);
		}

		this.cleanupConnection();

		if (!this.intentionalClose) {
			setConnectionState({
				status: 'reconnecting',
				error: `Connection lost (code: ${code})`
			});
			this.scheduleReconnect();
		}
	}

	private cleanupConnection(): void {
		this.isAcked = false;
		this.detachWebSocketEventListeners();

		if (this.kaTimer !== null) {
			clearInterval(this.kaTimer);
			this.kaTimer = null;
		}

		this.specToHandleMap.clear();
		this.activeSubscriptions.clear();
		this.pendingStarts.clear();
		this.queue = [];
		this.isFlushScheduled = false;
	}

	// ── Reconnection with exponential backoff ─────────────────────────

	private scheduleReconnect(): void {
		if (this.intentionalClose) return;
		if (this.reconnectAttempt >= RECONNECT_MAX_ATTEMPTS) {
			log.error('Max reconnect attempts reached. Giving up.');
			setConnectionState({ status: 'disconnected', error: 'Max reconnect attempts reached' });
			return;
		}

		const delay = Math.min(
			RECONNECT_BASE_MS * Math.pow(2, this.reconnectAttempt),
			RECONNECT_MAX_MS
		);
		const jitter = delay * 0.2 * Math.random();
		const finalDelay = Math.round(delay + jitter);

		this.reconnectAttempt++;
		setConnectionState({ reconnectAttempt: this.reconnectAttempt });
		log.info(`Reconnecting in ${finalDelay}ms (attempt ${this.reconnectAttempt})`);

		this.reconnectTimer = setTimeout(async () => {
			this.reconnectTimer = null;

			if (this.getToken) {
				try {
					const freshToken = await this.getToken();
					this.auth = { mode: 'cognito', idToken: freshToken };
				} catch (e) {
					log.error('Failed to refresh token for reconnect', e);
				}
			}

			this.resetReadyPromise();
			this.connect();
		}, finalDelay);
	}

	private cancelReconnect(): void {
		if (this.reconnectTimer !== null) {
			clearTimeout(this.reconnectTimer);
			this.reconnectTimer = null;
		}
	}

	// ── Message handling ──────────────────────────────────────────────

	private onWsMessage(evt: MessageEvent): void {
		const msg = safeJsonParse<AppSyncMessage>(String(evt.data));
		if (!msg || !msg.type) return;

		if (msg.type !== MSG_TYPE.KA) {
			log.debug(`[${msg.type}]`, msg);
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
		}
	}

	private handleConnectionAck(msg: AppSyncMessage<{ connectionTimeoutMs?: number }>): void {
		const isReconnect = this.reconnectAttempt > 0;
		this.isAcked = true;
		this.reconnectAttempt = 0;
		this.connectionTimeoutMs = msg.payload?.connectionTimeoutMs ?? DEFAULT_CONNECTION_TIMEOUT_MS;
		this.resolveReady();
		this.lastKa = Date.now();

		setConnectionState({
			status: 'connected',
			lastConnectedAt: Date.now(),
			reconnectAttempt: 0,
			error: null
		});

		if (this.kaTimer === null) {
			this.kaTimer = window.setInterval(() => {
				if (Date.now() - this.lastKa > this.connectionTimeoutMs) {
					log.error('AppSync Keep-Alive timeout exceeded. Closing connection.');
					this.websocket?.close(WS_CLOSE_POLICY_VIOLATION, 'KA Timeout');
				}
			}, KA_CHECK_INTERVAL_MS);
		}

		for (const frame of this.pendingStarts.values()) {
			this.send(frame);
		}
		this.pendingStarts.clear();

		this.setupManagedSubscriptions();

		if (isReconnect) {
			log.info('Reconnected successfully. Notifying sync managers.');
			for (const cb of this.onReconnectCallbacks) {
				try {
					cb();
				} catch (e) {
					log.error('onReconnect callback error', e);
				}
			}
		}
	}

	private handleDataMessage(msg: AppSyncMessage): void {
		if (this.queue.length >= MAX_QUEUE_SIZE) {
			log.warn('Message queue full. Dropping data message.');
			return;
		}
		this.queue.push(msg);
		this.scheduleFlush();
	}

	private handleErrorMessage(msg: AppSyncMessage): void {
		if (msg.id) {
			const sub = this.activeSubscriptions.get(msg.id);
			sub?.error?.(msg.payload ?? msg);
		} else {
			log.error('AppSync Protocol Error:', msg.payload ?? msg);
		}
	}

	private handleCompleteMessage(msg: AppSyncMessage): void {
		if (msg.id) {
			this.activeSubscriptions.delete(msg.id);
		}
	}

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
				log.error('Error processing subscription data queue', e);
			} finally {
				this.queue = [];
				this.isFlushScheduled = false;
			}
		});
	};

	// ── Utilities ─────────────────────────────────────────────────────

	private send(obj: AppSyncMessage): boolean {
		if (this.websocket?.readyState === WebSocket.OPEN) {
			try {
				this.websocket.send(JSON.stringify(obj));
				return true;
			} catch (e) {
				log.error('Failed to send WebSocket message', e);
				this.websocket.close(WS_CLOSE_POLICY_VIOLATION, 'Transport Error');
				return false;
			}
		}
		log.debug('Cannot send, websocket not OPEN.', obj.type);
		return false;
	}

	private getAuthHeaders(): Record<string, string> {
		const baseHeaders = { host: this.httpHost };
		if (this.auth.mode === 'apiKey') {
			return { ...baseHeaders, 'x-api-key': this.auth.apiKey };
		}
		return { ...baseHeaders, Authorization: this.auth.idToken };
	}

	private setupManagedSubscriptions(): void {
		for (const spec of this.subscriptionSpecs) {
			if (!this.specToHandleMap.has(spec)) {
				this.setupManagedSubscription(spec);
			}
		}
	}

	private setupManagedSubscription<T>(spec: SubscriptionSpec<T>): void {
		log.debug('Setting up managed subscription:', spec);

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
				try {
					const picked = selector(payload);
					if (picked !== undefined) spec.next(picked);
				} catch (e) {
					const errorHandler = spec.error ?? log.error.bind(log);
					errorHandler('Subscription selector error', e);
				}
			},
			error: spec.error ?? ((e: unknown) => log.error('Managed subscription error', e))
		});

		this.specToHandleMap.set(spec, handle);
	}
}

// ── Singleton helpers ───────────────────────────────────────────────

let appSyncWsClientSingleton: AppSyncWsClient | null = null;

export const getAppSyncWsClient = (): AppSyncWsClient | null => appSyncWsClientSingleton;

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

export const destroyAppSyncWsClient = (): void => {
	if (appSyncWsClientSingleton) {
		appSyncWsClientSingleton.disconnect();
		appSyncWsClientSingleton = null;
	}
	resetConnectionState();
};
