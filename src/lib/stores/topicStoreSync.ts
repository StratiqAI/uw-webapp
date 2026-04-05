/**
 * TopicStoreSync
 *
 * Cross-tab synchronisation and localStorage persistence for ValidatedTopicStore.
 *
 * - BroadcastChannel sends granular change messages to other same-origin tabs.
 * - localStorage keeps a flat topic→value snapshot so state survives reloads.
 * - UI-created SchemaRegistrations (source === 'ui') are persisted separately.
 *
 * Call initTopicStoreSync(store) once at app startup (after schema registration).
 * It returns a cleanup function that closes the channel and clears timers.
 */

import type { ValidatedTopicStore, SchemaRegistration, StoreChangeEvent } from './validatedTopicStore';
import { createLogger } from '$lib/utils/logger';

const log = createLogger('store');

// ── localStorage keys ───────────────────────────────────────────────
const DATA_KEY = 'vts:data';
const SCHEMA_KEY = 'vts:schemas';

// ── BroadcastChannel name ───────────────────────────────────────────
const CHANNEL = 'vts-sync';

// ── Debounce for localStorage writes ────────────────────────────────
const PERSIST_DEBOUNCE_MS = 500;

// ── Message types sent over BroadcastChannel ────────────────────────

interface PublishMsg {
	kind: 'publish';
	topic: string;
	value: unknown;
	sender: string;
}

interface DeleteMsg {
	kind: 'delete';
	topic: string;
	sender: string;
}

interface ClearMsg {
	kind: 'clear';
	path: string;
	sender: string;
}

interface SchemaMsg {
	kind: 'register-schema';
	registration: SchemaRegistration;
	sender: string;
}

type SyncMessage = PublishMsg | DeleteMsg | ClearMsg | SchemaMsg;

// ── Helpers ─────────────────────────────────────────────────────────

function tryParseJSON<T>(raw: string | null): T | null {
	if (!raw) return null;
	try {
		return JSON.parse(raw) as T;
	} catch {
		return null;
	}
}

/**
 * Initialise cross-tab sync and localStorage persistence for the given store.
 *
 * Must be called in a browser context (guarded internally; returns a no-op if
 * `window` is undefined).
 *
 * @returns A cleanup function that tears down the channel and timers.
 */
export function initTopicStoreSync(store: ValidatedTopicStore): () => void {
	if (typeof window === 'undefined') return () => {};

	const tabId = crypto.randomUUID();
	const channel = new BroadcastChannel(CHANNEL);

	/** When true, incoming remote changes are being applied — skip re-broadcast. */
	let isSyncing = false;

	/** In-memory flat map mirroring every topic → value that has been published. */
	const topicSnapshot = new Map<string, unknown>();

	/** Timer handle for debounced localStorage writes. */
	let persistTimer: ReturnType<typeof setTimeout> | null = null;

	// ── Restore persisted state ─────────────────────────────────────

	restoreSchemas(store);
	restoreTopics(store, topicSnapshot);

	// ── Listen for local store mutations ────────────────────────────

	const unsubscribe = store.onChange((event: StoreChangeEvent) => {
		if (isSyncing) return;

		switch (event.type) {
			case 'publish':
				topicSnapshot.set(event.topic, event.value);
				channel.postMessage({ kind: 'publish', topic: event.topic, value: event.value, sender: tabId } satisfies PublishMsg);
				schedulePersist();
				break;

			case 'delete':
				topicSnapshot.delete(event.topic);
				channel.postMessage({ kind: 'delete', topic: event.topic, sender: tabId } satisfies DeleteMsg);
				schedulePersist();
				break;

			case 'clear':
				// Remove all topics under the cleared path
				for (const key of topicSnapshot.keys()) {
					if (key === event.path || key.startsWith(event.path + '/')) {
						topicSnapshot.delete(key);
					}
				}
				channel.postMessage({ kind: 'clear', path: event.path, sender: tabId } satisfies ClearMsg);
				schedulePersist();
				break;

			case 'register-schema':
				if (event.registration.source === 'ui') {
					persistSchemas(store);
					channel.postMessage({ kind: 'register-schema', registration: event.registration, sender: tabId } satisfies SchemaMsg);
				}
				break;
		}
	});

	// ── Listen for remote tab messages ──────────────────────────────

	channel.onmessage = (evt: MessageEvent<SyncMessage>) => {
		const msg = evt.data;
		if (msg.sender === tabId) return;

		isSyncing = true;
		try {
			switch (msg.kind) {
				case 'publish': {
					topicSnapshot.set(msg.topic, msg.value);
					const ok = store.publish(msg.topic, msg.value);
					if (!ok) {
						log.warn(`[TopicStoreSync] Remote publish rejected by validation: ${msg.topic}`);
					}
					break;
				}

				case 'delete':
					topicSnapshot.delete(msg.topic);
					store.delete(msg.topic);
					break;

				case 'clear':
					for (const key of topicSnapshot.keys()) {
						if (key === msg.path || key.startsWith(msg.path + '/')) {
							topicSnapshot.delete(key);
						}
					}
					store.clearAllAt(msg.path);
					break;

				case 'register-schema':
					store.registerSchema(msg.registration);
					persistSchemas(store);
					break;
			}
		} finally {
			isSyncing = false;
		}

		schedulePersist();
	};

	// ── Persist helpers ─────────────────────────────────────────────

	function flushPersist(): void {
		if (persistTimer) clearTimeout(persistTimer);
		persistTimer = null;
		try {
			const obj: Record<string, unknown> = {};
			for (const [k, v] of topicSnapshot) obj[k] = v;
			localStorage.setItem(DATA_KEY, JSON.stringify(obj));
		} catch {
			// localStorage quota exceeded or unavailable — silently skip
		}
	}

	function schedulePersist(): void {
		if (persistTimer) clearTimeout(persistTimer);
		persistTimer = setTimeout(() => {
			persistTimer = null;
			flushPersist();
		}, PERSIST_DEBOUNCE_MS);
	}

	window.addEventListener('beforeunload', flushPersist);

	// ── Cleanup ─────────────────────────────────────────────────────

	return () => {
		unsubscribe();
		channel.close();
		window.removeEventListener('beforeunload', flushPersist);
		flushPersist();
	};
}

// ── Restore functions (used on init) ────────────────────────────────

function restoreSchemas(store: ValidatedTopicStore): void {
	const saved = tryParseJSON<SchemaRegistration[]>(localStorage.getItem(SCHEMA_KEY));
	if (!Array.isArray(saved)) return;

	let count = 0;
	for (const reg of saved) {
		if (reg && reg.id && reg.jsonSchema) {
			try {
				store.registerSchema(reg);
				count++;
			} catch {
				// Skip invalid schemas
			}
		}
	}
	if (count > 0) {
		log.info(`[TopicStoreSync] Restored ${count} UI schema(s) from localStorage`);
	}
}

function restoreTopics(store: ValidatedTopicStore, snapshot: Map<string, unknown>): void {
	const saved = tryParseJSON<Record<string, unknown>>(localStorage.getItem(DATA_KEY));
	if (!saved || typeof saved !== 'object') return;

	let count = 0;
	let rejected = 0;
	for (const [topic, value] of Object.entries(saved)) {
		try {
			const ok = store.publish(topic, value);
			if (ok) {
				snapshot.set(topic, value);
				count++;
			} else {
				rejected++;
				log.warn(`[TopicStoreSync] Restore rejected by validation: ${topic}`);
			}
		} catch {
			rejected++;
		}
	}
	if (count > 0 || rejected > 0) {
		log.info(`[TopicStoreSync] Restored ${count} topic(s) from localStorage` +
			(rejected > 0 ? ` (${rejected} rejected)` : ''));
	}
}

// ── Schema persistence ──────────────────────────────────────────────

function persistSchemas(store: ValidatedTopicStore): void {
	try {
		const uiSchemas = store.getAllSchemaDefinitions().filter((s) => s.source === 'ui');
		localStorage.setItem(SCHEMA_KEY, JSON.stringify(uiSchemas));
	} catch {
		// quota exceeded or unavailable
	}
}
