/**
 * Topic Publisher Examples
 * 
 * Examples of how to create custom publishers for different data sources.
 * These can be used as templates for creating your own publishers.
 */

import { BaseTopicPublisher, PollingPublisher, StaticPublisher, publisherRegistry, type PublisherConfig } from './TopicPublisher';

/**
 * Example 1: API Publisher
 * Fetches data from a REST API endpoint
 */
export class ApiPublisher extends PollingPublisher {
	constructor(config: PublisherConfig, private apiUrl: string, private apiOptions?: RequestInit) {
		super(config, async () => {
			const response = await fetch(apiUrl, apiOptions);
			if (!response.ok) {
				throw new Error(`API request failed: ${response.statusText}`);
			}
			return await response.json();
		});
	}
}

/**
 * Example 2: WebSocket Publisher
 * Subscribes to a WebSocket and publishes messages
 */
export class WebSocketPublisher extends BaseTopicPublisher {
	private ws: WebSocket | null = null;
	private reconnectAttempts = 0;
	private maxReconnectAttempts = 5;
	private reconnectDelay = 1000;

	constructor(config: PublisherConfig, private wsUrl: string) {
		super(config);
	}

	protected async fetchData(): Promise<unknown> {
		// WebSocket doesn't use fetch, data comes via messages
		return this._lastValue;
	}

	protected async onStart(): Promise<void> {
		this.connect();
	}

	protected async onStop(): Promise<void> {
		if (this.ws) {
			this.ws.close();
			this.ws = null;
		}
		this.reconnectAttempts = 0;
	}

	private connect(): void {
		try {
			this.ws = new WebSocket(this.wsUrl);

			this.ws.onopen = () => {
				this._status = 'running';
				this._lastError = null;
				this.reconnectAttempts = 0;
				console.log(`[WebSocketPublisher:${this.id}] Connected`);
			};

			this.ws.onmessage = (event) => {
				try {
					const data = JSON.parse(event.data);
					this.publishData(data).catch(error => {
						console.error(`[WebSocketPublisher:${this.id}] Error publishing:`, error);
					});
				} catch (error) {
					console.error(`[WebSocketPublisher:${this.id}] Error parsing message:`, error);
				}
			};

			this.ws.onerror = (error) => {
				this._status = 'error';
				this._lastError = new Error('WebSocket error');
				console.error(`[WebSocketPublisher:${this.id}] WebSocket error:`, error);
			};

			this.ws.onclose = () => {
				if (this._status === 'running' && this.reconnectAttempts < this.maxReconnectAttempts) {
					// Attempt to reconnect
					this.reconnectAttempts++;
					setTimeout(() => this.connect(), this.reconnectDelay * this.reconnectAttempts);
				} else {
					this._status = 'stopped';
				}
			};
		} catch (error) {
			this._status = 'error';
			this._lastError = error instanceof Error ? error : new Error(String(error));
		}
	}

	async publish(): Promise<void> {
		// WebSocket publishers don't support manual publish
		// They publish automatically when messages arrive
		throw new Error('WebSocket publishers publish automatically on message receive');
	}
}

/**
 * Example 3: File Publisher
 * Reads data from a file (useful for local development or static data)
 */
export class FilePublisher extends PollingPublisher {
	constructor(config: PublisherConfig, private filePath: string) {
		super(config, async () => {
			const response = await fetch(filePath);
			if (!response.ok) {
				throw new Error(`Failed to load file: ${response.statusText}`);
			}
			return await response.json();
		});
	}
}

/**
 * Example 4: Database Publisher (conceptual)
 * Would connect to a database and query for data
 * 
 * Note: Actual implementation would depend on your database library
 */
export class DatabasePublisher extends PollingPublisher {
	constructor(
		config: PublisherConfig,
		private queryFn: () => Promise<unknown>
	) {
		super(config, queryFn);
	}
}

/**
 * Example 5: Event-Driven Publisher
 * Publishes data when external events occur (e.g., user actions, system events)
 */
export class EventDrivenPublisher extends BaseTopicPublisher {
	private eventHandlers: Map<string, (event: Event) => void> = new Map();

	constructor(config: PublisherConfig) {
		super(config);
	}

	/**
	 * Register an event listener
	 */
	on(eventType: string, handler: (data: unknown) => Promise<unknown>): void {
		const wrappedHandler = async (event: Event) => {
			try {
				const data = await handler(event);
				await this.publishData(data);
			} catch (error) {
				console.error(`[EventDrivenPublisher:${this.id}] Error handling event:`, error);
			}
		};

		window.addEventListener(eventType, wrappedHandler as EventListener);
		this.eventHandlers.set(eventType, wrappedHandler as (event: Event) => void);
	}

	protected async fetchData(): Promise<unknown> {
		// Event-driven publishers don't fetch, they react to events
		return this._lastValue;
	}

	protected async onStop(): Promise<void> {
		// Remove all event listeners
		for (const [eventType, handler] of this.eventHandlers.entries()) {
			window.removeEventListener(eventType, handler as EventListener);
		}
		this.eventHandlers.clear();
	}

	async publish(): Promise<void> {
		// Event-driven publishers don't support manual publish
		throw new Error('Event-driven publishers publish automatically on events');
	}
}

/**
 * Example usage:
 * 
 * // Static publisher
 * const staticPub = new StaticPublisher({
 *   id: 'my-static-pub',
 *   topic: 'my-topic',
 *   schemaId: 'my-schema-v1'
 * }, { value: 'Hello World' });
 * publisherRegistry.register(staticPub);
 * 
 * // API publisher
 * const apiPub = new ApiPublisher({
 *   id: 'my-api-pub',
 *   topic: 'api-data',
 *   interval: 10000, // Poll every 10 seconds
 *   autoStart: true
 * }, 'https://api.example.com/data');
 * publisherRegistry.register(apiPub);
 * 
 * // WebSocket publisher
 * const wsPub = new WebSocketPublisher({
 *   id: 'my-ws-pub',
 *   topic: 'realtime-data',
 *   autoStart: true
 * }, 'wss://api.example.com/stream');
 * publisherRegistry.register(wsPub);
 */

