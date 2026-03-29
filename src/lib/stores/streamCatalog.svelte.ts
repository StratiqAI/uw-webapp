/**
 * StreamCatalog
 *
 * A client-side store of named "data streams" — each stream binds a named
 * topic to a schema ID (from ValidatedTopicStore) and optionally to a Prompt.
 *
 * - CRUD: addStream, removeStream, updateStream
 * - On addStream: registers the stream's schema as a topic-pattern in ValidatedTopicStore
 * - Persistence: localStorage key 'stream-catalog' (JSON array)
 * - Cross-tab sync: BroadcastChannel('stream-catalog-sync')
 * - Reactive state: $state so Svelte components update automatically
 */

import { validatedTopicStore } from './validatedTopicStore';

// ── Storage key ─────────────────────────────────────────────────────
const STORAGE_KEY = 'stream-catalog';
const CHANNEL_NAME = 'stream-catalog-sync';

// ── Types ────────────────────────────────────────────────────────────

export interface DataStream {
	id: string;
	topic: string;
	schemaId: string;
	title: string;
	description?: string;
	promptId?: string;
	promptName?: string;
	source: 'prompt' | 'manual' | 'code';
	createdAt: string;
	updatedAt: string;
}

interface CatalogMsg {
	kind: 'add' | 'remove' | 'update';
	stream?: DataStream;
	id?: string;
	sender: string;
}

// ── Helpers ──────────────────────────────────────────────────────────

function tryParseJSON<T>(raw: string | null): T | null {
	if (!raw) return null;
	try {
		return JSON.parse(raw) as T;
	} catch {
		return null;
	}
}

function loadFromStorage(): DataStream[] {
	if (typeof localStorage === 'undefined') return [];
	return tryParseJSON<DataStream[]>(localStorage.getItem(STORAGE_KEY)) ?? [];
}

function saveToStorage(streams: DataStream[]): void {
	if (typeof localStorage === 'undefined') return;
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(streams));
	} catch {
		// quota exceeded or unavailable — silently skip
	}
}

// ── Register a stream's schema as a topic pattern in ValidatedTopicStore ──

function registerStreamSchema(stream: DataStream): void {
	const reg = validatedTopicStore.getSchemaById(stream.schemaId);
	if (!reg) return;

	// Only register if there isn't already a topic-pattern for this exact topic.
	const existing = validatedTopicStore.getSchemaForTopic(stream.topic);
	if (existing && existing.id === stream.schemaId) return;

	try {
		validatedTopicStore.registerSchema({
			...reg,
			id: `stream:${stream.id}`,
			topicPattern: stream.topic,
			source: 'ui'
		});
	} catch {
		// Already registered or invalid — skip
	}
}

// ── StreamCatalog class ───────────────────────────────────────────────

class StreamCatalogStore {
	#streams = $state<DataStream[]>([]);
	#tabId: string = typeof crypto !== 'undefined' ? crypto.randomUUID() : Math.random().toString(36);
	#channel: BroadcastChannel | null = null;
	#initialized = false;

	get streams(): DataStream[] {
		return this.#streams;
	}

	// ── Lifecycle ──────────────────────────────────────────────────

	init(): void {
		if (this.#initialized || typeof window === 'undefined') return;
		this.#initialized = true;

		// Restore persisted streams
		const saved = loadFromStorage();
		this.#streams = saved;

		// Re-register all stream schemas in the store
		for (const stream of saved) {
			registerStreamSchema(stream);
		}

		// Cross-tab sync
		this.#channel = new BroadcastChannel(CHANNEL_NAME);
		this.#channel.onmessage = (evt: MessageEvent<CatalogMsg>) => {
			const msg = evt.data;
			if (msg.sender === this.#tabId) return;

			switch (msg.kind) {
				case 'add':
					if (msg.stream) {
						const exists = this.#streams.find((s) => s.id === msg.stream!.id);
						if (!exists) {
							this.#streams = [...this.#streams, msg.stream];
							registerStreamSchema(msg.stream);
							saveToStorage(this.#streams);
						}
					}
					break;
				case 'remove':
					if (msg.id) {
						this.#streams = this.#streams.filter((s) => s.id !== msg.id);
						saveToStorage(this.#streams);
					}
					break;
				case 'update':
					if (msg.stream) {
						this.#streams = this.#streams.map((s) =>
							s.id === msg.stream!.id ? msg.stream! : s
						);
						if (msg.stream) registerStreamSchema(msg.stream);
						saveToStorage(this.#streams);
					}
					break;
			}
		};
	}

	destroy(): void {
		this.#channel?.close();
		this.#initialized = false;
	}

	// ── CRUD ──────────────────────────────────────────────────────

	addStream(params: Omit<DataStream, 'id' | 'createdAt' | 'updatedAt'>): DataStream {
		const now = new Date().toISOString();
		const stream: DataStream = {
			...params,
			id: crypto.randomUUID(),
			createdAt: now,
			updatedAt: now
		};

		this.#streams = [...this.#streams, stream];
		registerStreamSchema(stream);
		saveToStorage(this.#streams);

		this.#channel?.postMessage({
			kind: 'add',
			stream,
			sender: this.#tabId
		} satisfies CatalogMsg);

		return stream;
	}

	removeStream(id: string): void {
		this.#streams = this.#streams.filter((s) => s.id !== id);
		saveToStorage(this.#streams);

		this.#channel?.postMessage({
			kind: 'remove',
			id,
			sender: this.#tabId
		} satisfies CatalogMsg);
	}

	updateStream(id: string, updates: Partial<Omit<DataStream, 'id' | 'createdAt'>>): DataStream | null {
		const index = this.#streams.findIndex((s) => s.id === id);
		if (index === -1) return null;

		const updated: DataStream = {
			...this.#streams[index],
			...updates,
			id,
			updatedAt: new Date().toISOString()
		};

		this.#streams = [...this.#streams.slice(0, index), updated, ...this.#streams.slice(index + 1)];
		registerStreamSchema(updated);
		saveToStorage(this.#streams);

		this.#channel?.postMessage({
			kind: 'update',
			stream: updated,
			sender: this.#tabId
		} satisfies CatalogMsg);

		return updated;
	}

	// ── Queries ───────────────────────────────────────────────────

	getStream(id: string): DataStream | undefined {
		return this.#streams.find((s) => s.id === id);
	}

	getStreamByTopic(topic: string): DataStream | undefined {
		return this.#streams.find((s) => s.topic === topic);
	}

	getStreamByPromptId(promptId: string): DataStream | undefined {
		return this.#streams.find((s) => s.promptId === promptId);
	}

	getStreamsBySchemaId(schemaId: string): DataStream[] {
		return this.#streams.filter((s) => s.schemaId === schemaId);
	}

	/** Returns all streams whose schemaId matches a given promptId's schema */
	getStreamsForPrompt(promptId: string): DataStream[] {
		return this.#streams.filter((s) => s.promptId === promptId);
	}
}

// ── Singleton ─────────────────────────────────────────────────────────

export const streamCatalog = new StreamCatalogStore();
