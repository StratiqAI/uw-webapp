/**
 * Topic Publisher System
 * 
 * Provides a flexible interface for creating publishers that feed data into MapStore topics.
 * Publishers can pull data from various sources: APIs, WebSockets, files, databases, etc.
 */

import { mapStore } from './MapStore';
import { browser } from '$app/environment';

/**
 * Publisher status
 */
export type PublisherStatus = 'idle' | 'running' | 'paused' | 'error' | 'stopped';

/**
 * Publisher configuration
 */
export interface PublisherConfig {
	/** Unique identifier for this publisher */
	id: string;
	/** Topic name to publish to */
	topic: string;
	/** Schema ID to enforce (optional) */
	schemaId?: string;
	/** Human-readable name */
	name?: string;
	/** Description of what this publisher does */
	description?: string;
	/** Whether to start automatically */
	autoStart?: boolean;
	/** Update interval in milliseconds (for polling publishers) */
	interval?: number;
	/** Additional metadata */
	metadata?: Record<string, unknown>;
}

/**
 * Publisher interface that all publishers must implement
 */
export interface ITopicPublisher {
	/** Unique publisher ID */
	readonly id: string;
	/** Topic this publisher writes to */
	readonly topic: string;
	/** Current status */
	readonly status: PublisherStatus;
	/** Last error (if any) */
	readonly lastError: Error | null;
	/** Last published value */
	readonly lastValue: unknown;
	/** Configuration */
	readonly config: PublisherConfig;

	/**
	 * Start the publisher
	 * Begins fetching/polling data and publishing to the topic
	 */
	start(): Promise<void>;

	/**
	 * Stop the publisher
	 * Stops fetching data and cleans up resources
	 */
	stop(): Promise<void>;

	/**
	 * Pause the publisher
	 * Temporarily stops publishing but keeps resources alive
	 */
	pause(): Promise<void>;

	/**
	 * Resume a paused publisher
	 */
	resume(): Promise<void>;

	/**
	 * Manually trigger a data fetch and publish
	 * Useful for testing or manual refresh
	 */
	publish(): Promise<void>;

	/**
	 * Dispose of the publisher
	 * Cleans up all resources and removes from registry
	 */
	dispose(): Promise<void>;
}

/**
 * Base publisher class with common functionality
 */
export abstract class BaseTopicPublisher implements ITopicPublisher {
	readonly id: string;
	readonly topic: string;
	readonly config: PublisherConfig;
	
	protected _status: PublisherStatus = 'idle';
	protected _lastError: Error | null = null;
	protected _lastValue: unknown = undefined;
	protected _publisher: ReturnType<typeof mapStore.getPublisher> | null = null;

	constructor(config: PublisherConfig) {
		this.id = config.id;
		this.topic = config.topic;
		this.config = config;

		// Enforce schema if provided
		if (config.schemaId) {
			mapStore.enforceTopicSchema(config.topic, config.schemaId);
		}

		// Create publisher handle
		this._publisher = mapStore.getPublisher(config.topic, config.id);
	}

	get status(): PublisherStatus {
		return this._status;
	}

	get lastError(): Error | null {
		return this._lastError;
	}

	get lastValue(): unknown {
		return this._lastValue;
	}

	/**
	 * Abstract method: Fetch data from source
	 * Each publisher type implements this differently
	 */
	protected abstract fetchData(): Promise<unknown>;

	/**
	 * Publish data to the topic
	 */
	protected async publishData(data: unknown): Promise<void> {
		if (!this._publisher) {
			throw new Error(`Publisher ${this.id} has been disposed`);
		}

		try {
			this._publisher.publish(data);
			this._lastValue = data;
			this._lastError = null;
		} catch (error) {
			this._lastError = error instanceof Error ? error : new Error(String(error));
			throw this._lastError;
		}
	}

	async start(): Promise<void> {
		if (this._status === 'running') {
			return;
		}

		if (this._status === 'stopped') {
			throw new Error(`Publisher ${this.id} has been stopped and cannot be restarted`);
		}

		this._status = 'running';
		await this.onStart();
	}

	async stop(): Promise<void> {
		if (this._status === 'stopped') {
			return;
		}

		this._status = 'stopped';
		await this.onStop();
	}

	async pause(): Promise<void> {
		if (this._status !== 'running') {
			return;
		}

		this._status = 'paused';
		await this.onPause();
	}

	async resume(): Promise<void> {
		if (this._status !== 'paused') {
			return;
		}

		this._status = 'running';
		await this.onResume();
	}

	async publish(): Promise<void> {
		if (this._status === 'stopped') {
			throw new Error(`Publisher ${this.id} has been stopped`);
		}

		try {
			const data = await this.fetchData();
			await this.publishData(data);
		} catch (error) {
			this._status = 'error';
			this._lastError = error instanceof Error ? error : new Error(String(error));
			throw this._lastError;
		}
	}

	async dispose(): Promise<void> {
		await this.stop();
		if (this._publisher) {
			this._publisher.dispose();
			this._publisher = null;
		}
		await this.onDispose();
	}

	// Lifecycle hooks for subclasses
	protected async onStart(): Promise<void> {}
	protected async onStop(): Promise<void> {}
	protected async onPause(): Promise<void> {}
	protected async onResume(): Promise<void> {}
	protected async onDispose(): Promise<void> {}
}

/**
 * Static data publisher
 * Publishes a fixed value or initial data
 */
export class StaticPublisher extends BaseTopicPublisher {
	private data: unknown;

	constructor(config: PublisherConfig, data: unknown) {
		super(config);
		this.data = data;
	}

	protected async fetchData(): Promise<unknown> {
		return this.data;
	}

	async start(): Promise<void> {
		await super.start();
		// Publish immediately when started
		await this.publish();
	}
}

/**
 * Polling publisher
 * Fetches data at regular intervals
 */
export class PollingPublisher extends BaseTopicPublisher {
	private intervalId: ReturnType<typeof setInterval> | null = null;
	private fetchFn: () => Promise<unknown>;

	constructor(config: PublisherConfig, fetchFn: () => Promise<unknown>) {
		super(config);
		this.fetchFn = fetchFn;
	}

	protected async fetchData(): Promise<unknown> {
		return await this.fetchFn();
	}

	protected async onStart(): Promise<void> {
		// Publish immediately
		await this.publish();

		// Then set up polling
		const interval = this.config.interval || 5000; // Default 5 seconds
		this.intervalId = setInterval(async () => {
			if (this._status === 'running') {
				try {
					await this.publish();
				} catch (error) {
					console.error(`[PollingPublisher:${this.id}] Error during polling:`, error);
					this._status = 'error';
					this._lastError = error instanceof Error ? error : new Error(String(error));
				}
			}
		}, interval);
	}

	protected async onStop(): Promise<void> {
		if (this.intervalId) {
			clearInterval(this.intervalId);
			this.intervalId = null;
		}
	}

	protected async onPause(): Promise<void> {
		if (this.intervalId) {
			clearInterval(this.intervalId);
			this.intervalId = null;
		}
	}

	protected async onResume(): Promise<void> {
		await this.onStart();
	}
}

/**
 * Publisher Registry
 * Manages all active publishers
 */
class PublisherRegistry {
	private publishers = new Map<string, ITopicPublisher>();

	/**
	 * Register a publisher
	 */
	register(publisher: ITopicPublisher): void {
		if (this.publishers.has(publisher.id)) {
			console.warn(`[PublisherRegistry] Publisher ${publisher.id} already exists, replacing...`);
			this.unregister(publisher.id);
		}

		this.publishers.set(publisher.id, publisher);

		// Auto-start if configured
		if (publisher.config.autoStart !== false) {
			publisher.start().catch(error => {
				console.error(`[PublisherRegistry] Failed to auto-start publisher ${publisher.id}:`, error);
			});
		}
	}

	/**
	 * Unregister a publisher
	 */
	async unregister(id: string): Promise<void> {
		const publisher = this.publishers.get(id);
		if (publisher) {
			await publisher.dispose();
			this.publishers.delete(id);
		}
	}

	/**
	 * Get a publisher by ID
	 */
	get(id: string): ITopicPublisher | undefined {
		return this.publishers.get(id);
	}

	/**
	 * Get all publishers
	 */
	getAll(): ITopicPublisher[] {
		return Array.from(this.publishers.values());
	}

	/**
	 * Get publishers for a specific topic
	 */
	getByTopic(topic: string): ITopicPublisher[] {
		return Array.from(this.publishers.values()).filter(p => p.topic === topic);
	}

	/**
	 * Stop all publishers
	 */
	async stopAll(): Promise<void> {
		const promises = Array.from(this.publishers.values()).map(p => p.stop());
		await Promise.all(promises);
	}

	/**
	 * Dispose all publishers
	 */
	async disposeAll(): Promise<void> {
		const promises = Array.from(this.publishers.values()).map(p => p.dispose());
		await Promise.all(promises);
		this.publishers.clear();
	}

	/**
	 * Get registry stats
	 */
	getStats() {
		const all = this.getAll();
		return {
			total: all.length,
			running: all.filter(p => p.status === 'running').length,
			paused: all.filter(p => p.status === 'paused').length,
			idle: all.filter(p => p.status === 'idle').length,
			error: all.filter(p => p.status === 'error').length,
			stopped: all.filter(p => p.status === 'stopped').length
		};
	}
}

// Singleton instance
export const publisherRegistry = new PublisherRegistry();

// Cleanup on page unload
if (browser) {
	window.addEventListener('beforeunload', () => {
		publisherRegistry.disposeAll().catch(console.error);
	});
}

