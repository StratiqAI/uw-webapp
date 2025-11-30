import { writable, type Writable, type Readable, get } from 'svelte/store';
import { schemaRegistry } from '$lib/stores/SchemaRegistry';
import { browser } from '$app/environment';

interface Entry {
	store: Writable<unknown>;
	schemaId?: string; // Enforced schema
	producers: Set<string>;
	consumers: Set<string>;
	lastValue: unknown;
}

interface BroadcastMessage {
	topic: string;
	data: unknown;
	originId: string;
}

export class MapStore {
	private registry = new Map<string, Entry>();

	// Multi-tab synchronization
	private channel: BroadcastChannel | null = null;
	private instanceId: string;

	constructor() {
		// Generate unique ID for THIS tab instance
		this.instanceId = crypto.randomUUID();

		// Initialize BroadcastChannel only in browser
		if (browser && typeof BroadcastChannel !== 'undefined') {
			try {
				this.channel = new BroadcastChannel('cre_dashboard_sync');

				// Listen for updates from OTHER tabs
				this.channel.onmessage = (event: MessageEvent<BroadcastMessage>) => {
					const { topic, data, originId } = event.data;

					// Ignore messages sent by MYSELF (Echo cancellation)
					if (originId === this.instanceId) return;

					// Update the local store silently (don't re-broadcast)
					this.injectRemoteUpdate(topic, data);
				};

				// Handle channel errors gracefully
				this.channel.onerror = (error) => {
					console.warn('[MapStore] BroadcastChannel error:', error);
				};
			} catch (error) {
				console.warn('[MapStore] Failed to initialize BroadcastChannel:', error);
				// Continue without multi-tab sync if BroadcastChannel is not available
			}
		}
	}

	private ensure(topic: string): Entry {
		if (!this.registry.has(topic)) {
			this.registry.set(topic, {
				store: writable(undefined),
				producers: new Set(),
				consumers: new Set(),
				lastValue: undefined
			});
		}
		return this.registry.get(topic)!;
	}

	/**
	 * Called when another tab tells us a value changed.
	 * We update our local state but DO NOT re-broadcast.
	 */
	private injectRemoteUpdate(topic: string, data: unknown) {
		const entry = this.ensure(topic);
		entry.lastValue = data;
		entry.store.set(data);
	}

	/**
	 * Bind a topic to a Schema ID.
	 * All future publishes will be validated.
	 */
	enforceTopicSchema(topic: string, schemaId: string) {
		const entry = this.ensure(topic);
		entry.schemaId = schemaId;
	}

	getStream(topic: string): Readable<unknown> & { get: () => unknown } {
		const entry = this.ensure(topic);
		return {
			subscribe: entry.store.subscribe,
			get: () => get(entry.store)
		};
	}

	getPublisher(topic: string, producerId: string) {
		const entry = this.ensure(topic);
		entry.producers.add(producerId);

		return {
			publish: (data: unknown) => {
				// Validation Gate
				if (entry.schemaId) {
					const validator = schemaRegistry.getValidator(entry.schemaId);
					if (validator) {
						const result = validator(data);

						if (!result.success) {
							// In production: Publish to 'sys:errors' topic
							console.error(`[MapStore] Validation Failed for ${topic}:`, result.error);
							return;
						}

						// Use sanitized/parsed data
						data = result.data;
					}
				}

				// Update Local Store
				entry.lastValue = data;
				entry.store.set(data);

				// Broadcast to other tabs (only if BroadcastChannel is available)
				if (this.channel) {
					try {
						// Only broadcast if the data is JSON-serializable
						// Functions/Classes won't work, but that's expected
						this.channel.postMessage({
							topic,
							data,
							originId: this.instanceId
						} as BroadcastMessage);
					} catch (e) {
						console.warn(`[MapStore] Data not serializable for topic ${topic}, skipping tab sync:`, e);
					}
				}
			},
			dispose: () => {
				entry.producers.delete(producerId);
			}
		};
	}

	/**
	 * Get metadata for a topic (schemaId, etc.)
	 * Used by UniversalWidget to resolve components
	 */
	getMetadata(topic: string): { schemaId?: string } | null {
		const entry = this.registry.get(topic);
		if (!entry) return null;
		return {
			schemaId: entry.schemaId
		};
	}

	/**
	 * Debugging: Get a snapshot of all active topics.
	 */
	getInspectorData() {
		return Array.from(this.registry.entries()).map(([topic, entry]) => ({
			topic,
			schemaId: entry.schemaId,
			producers: entry.producers.size,
			consumers: entry.consumers.size,
			hasValue: entry.lastValue !== undefined
		}));
	}
}

// Export singleton instance
export const mapStore = new MapStore();

