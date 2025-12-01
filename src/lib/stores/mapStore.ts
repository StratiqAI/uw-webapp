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

	getStream(topic: string, consumerId?: string): Readable<unknown> & { get: () => unknown } {
		const entry = this.ensure(topic);
		
		// Track consumer if ID provided
		if (consumerId) {
			entry.consumers.add(consumerId);
		}
		
		return {
			subscribe: (callback: (value: unknown) => void) => {
				// Track consumer with auto-generated ID if not provided
				const id = consumerId || `consumer-${crypto.randomUUID()}`;
				entry.consumers.add(id);
				
				const unsubscribe = entry.store.subscribe(callback);
				
				// Return unsubscribe that also removes consumer tracking
				return () => {
					unsubscribe();
					entry.consumers.delete(id);
				};
			},
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
	 * Get all topics that have a specific schema ID
	 */
	getTopicsBySchema(schemaId: string): string[] {
		const topics: string[] = [];
		for (const [topic, entry] of this.registry.entries()) {
			if (entry.schemaId === schemaId) {
				topics.push(topic);
			}
		}
		return topics;
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

	/**
	 * Dump all MapStore state to console for debugging
	 * Shows topics, producers, consumers, schemas, and data
	 */
	dump() {
		console.group('🗺️ MapStore Dump');
		console.log(`Instance ID: ${this.instanceId}`);
		console.log(`BroadcastChannel: ${this.channel ? 'Active' : 'Inactive'}`);
		console.log(`Total Topics: ${this.registry.size}`);
		console.log('');

		if (this.registry.size === 0) {
			console.log('No topics registered yet.');
			console.groupEnd();
			return;
		}

		// Group by topic
		for (const [topic, entry] of this.registry.entries()) {
			console.group(`📌 Topic: ${topic}`);
			
			// Schema
			if (entry.schemaId) {
				console.log(`🔒 Schema: ${entry.schemaId}`);
			} else {
				console.log('🔓 Schema: None (unvalidated)');
			}

			// Producers
			if (entry.producers.size > 0) {
				console.log(`📤 Producers (${entry.producers.size}):`, Array.from(entry.producers));
			} else {
				console.log('📤 Producers: None');
			}

			// Consumers
			if (entry.consumers.size > 0) {
				console.log(`📥 Consumers (${entry.consumers.size}):`, Array.from(entry.consumers));
			} else {
				console.log('📥 Consumers: None');
			}

			// Data
			if (entry.lastValue !== undefined) {
				console.log('💾 Data:', entry.lastValue);
				try {
					console.log('💾 Data (JSON):', JSON.stringify(entry.lastValue, null, 2));
				} catch (e) {
					console.log('💾 Data (not JSON-serializable)');
				}
			} else {
				console.log('💾 Data: No value set');
			}

			// Current store value
			const currentValue = get(entry.store);
			if (currentValue !== undefined && currentValue !== entry.lastValue) {
				console.warn('⚠️ Store value differs from lastValue:', currentValue);
			}

			console.groupEnd();
		}

		console.log('');
		console.log('📊 Summary:');
		const summary = {
			totalTopics: this.registry.size,
			topicsWithSchema: Array.from(this.registry.values()).filter(e => e.schemaId).length,
			topicsWithProducers: Array.from(this.registry.values()).filter(e => e.producers.size > 0).length,
			topicsWithConsumers: Array.from(this.registry.values()).filter(e => e.consumers.size > 0).length,
			topicsWithData: Array.from(this.registry.values()).filter(e => e.lastValue !== undefined).length,
			totalProducers: Array.from(this.registry.values()).reduce((sum, e) => sum + e.producers.size, 0),
			totalConsumers: Array.from(this.registry.values()).reduce((sum, e) => sum + e.consumers.size, 0)
		};
		console.table(summary);
		console.groupEnd();
	}
}

// Export singleton instance
export const mapStore = new MapStore();

