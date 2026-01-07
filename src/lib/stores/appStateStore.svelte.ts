/**
 * base-store.svelte.ts
 */

export interface HasId {
	id: string | number;
}

/**
 * Enhanced AppStateStore
 * Leverages Svelte 5's deep reactivity and proxy-based state.
 */
export class AppStateStore<T extends HasId> {
	// Private reactive state
	#entity = $state<T | null>(null);
	#collection = $state<T[]>([]);
	#loading = $state<boolean>(false);
	#error = $state<string | null>(null);

	constructor(initial?: { entity?: T; collection?: T[] }) {
		this.#entity = initial?.entity ?? null;
		this.#collection = initial?.collection ?? [];
	}

	// --- Getters (Publicly readable, reactive) ---
	get entity() { return this.#entity; }
	get collection() { return this.#collection; }
	get loading() { return this.#loading; }
	get error() { return this.#error; }
	
	// Derived state
	get count() { return this.#collection.length; }
	get hasError() { return this.#error !== null; }

	// --- Setters / Actions ---

	/** Sets the primary entity and resets error */
	set entity(value: T | null) {
		this.#entity = value;
		this.#error = null;
	}

	/** Deeply patches the existing entity */
	patch(updates: Partial<T>): void {
		if (this.#entity) {
			Object.assign(this.#entity, updates);
		}
	}

	/** Replaces the entire collection */
	set collection(items: T[]) {
		this.#collection = items;
	}

	/** 
	 * Adds or updates an item in the collection.
	 * In Svelte 5, mutating the array index directly is reactive.
	 */
	upsert(item: T): void {
		const index = this.#collection.findIndex((i) => i.id === item.id);
		if (index !== -1) {
			// Update existing: Object.assign maintains the proxy reference
			Object.assign(this.#collection[index], item);
		} else {
			// Add new
			this.#collection.push(item);
		}
	}

	/** Removes an item by ID */
	remove(id: T['id']): void {
		this.#collection = this.#collection.filter((item) => item.id !== id);
	}

	/**
	 * Higher-order function to wrap async operations.
	 * Handles loading and error states automatically.
	 */
	async wrap<R>(promise: Promise<R>): Promise<R | undefined> {
		this.#loading = true;
		this.#error = null;
		try {
			return await promise;
		} catch (e) {
			this.#error = e instanceof Error ? e.message : 'An unknown error occurred';
			return undefined;
		} finally {
			this.#loading = false;
		}
	}

	/** Resets the store to empty state */
	reset(): void {
		this.#entity = null;
		this.#collection = [];
		this.#loading = false;
		this.#error = null;
	}
}

/**
 * Logger utility for debugging Svelte 5 stores
 */
export function logStore(store: AppStateStore<any>) {
	$inspect(store.entity, store.collection, store.loading, store.error);
}