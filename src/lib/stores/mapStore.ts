import { writable, type Writable, type Readable, get } from 'svelte/store';
import { schemaRegistry } from '$lib/stores/SchemaRegistry';

interface Entry {
	store: Writable<unknown>;
	schemaId?: string; // Enforced schema
	producers: Set<string>;
	consumers: Set<string>;
	lastValue: unknown;
}

export class MapStore {
	private registry = new Map<string, Entry>();

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

						// Update store with sanitized/parsed data
						entry.lastValue = result.data;
						entry.store.set(result.data);
						return;
					}
				}

				// Unchecked Publish (System topics)
				entry.lastValue = data;
				entry.store.set(data);
			},
			dispose: () => {
				entry.producers.delete(producerId);
			}
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

