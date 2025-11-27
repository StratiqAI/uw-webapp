// lib/stores/ResourceManager.svelte.ts
type GraphQLClient = {
	request: <R = any, V = any>(query: string, variables?: V) => Promise<R>;
};

interface ResourceConfig {
	client: GraphQLClient;
	// The operation names as defined in your schema (used to extract data from response)
	keys: {
		list: string;   // e.g., "listPrompts"
		get?: string;   // e.g., "getPrompt"
		create?: string; // e.g., "createPrompt"
		update?: string; // e.g., "updatePrompt"
		delete?: string; // e.g., "deletePrompt"
	};
	// The raw GraphQL strings
	queries: {
		list: string;
		get?: string;
		create?: string;
		update?: string;
		delete?: string;
	};
}

export class ResourceManager<T extends { id: string }> {
	// -- Svelte 5 State --
	items = $state<T[]>([]);
	currentItem = $state<T | null>(null);
	isLoading = $state(false);
	error = $state<string | null>(null);
	nextToken = $state<string | null>(null);

	constructor(private config: ResourceConfig) {}

	/**
	 * List items (handles pagination and Generic List Response)
	 */
	async loadList(limit = 20, nextToken?: string | null) {
		this.isLoading = true;
		this.error = null;

		try {
			const variables = { limit, nextToken: nextToken ?? this.nextToken };
			const data = await this.config.client.request<any>(
				this.config.queries.list, 
				variables
			);

			// Extract data dynamically based on the operation name
			const result = data[this.config.keys.list]; 
			
			if (nextToken) {
				// Append if loading more
				this.items = [...this.items, ...result.items];
			} else {
				// Replace if fresh load
				this.items = result.items;
			}
			
			this.nextToken = result.nextToken;
		} catch (err: any) {
			console.error(`Error loading ${this.config.keys.list}:`, err);
			this.error = err.message || "Failed to load items";
		} finally {
			this.isLoading = false;
		}
	}

	/**
	 * Get a single item
	 */
	async loadOne(id: string) {
		if (!this.config.queries.get || !this.config.keys.get) return;
		
		this.isLoading = true;
		this.error = null;
		
		try {
			const data = await this.config.client.request<any>(
				this.config.queries.get, 
				{ id }
			);
			this.currentItem = data[this.config.keys.get];
		} catch (err: any) {
			this.error = err.message || "Failed to load item";
		} finally {
			this.isLoading = false;
		}
	}

	/**
	 * Create an item and add it to the local list
	 */
	async create(input: any) {
		if (!this.config.queries.create || !this.config.keys.create) return;

		this.isLoading = true;
		this.error = null;

		try {
			const data = await this.config.client.request<any>(
				this.config.queries.create, 
				{ input }
			);
			const newItem = data[this.config.keys.create];
			
			// Update local state immediately
			this.items = [newItem, ...this.items];
			return newItem;
		} catch (err: any) {
			this.error = err.message || "Failed to create item";
			throw err;
		} finally {
			this.isLoading = false;
		}
	}

	/**
	 * Update an item and reflect changes in local list
	 */
	async update(id: string, input: any) {
		if (!this.config.queries.update || !this.config.keys.update) return;

		this.isLoading = true;
		this.error = null;

		try {
			const data = await this.config.client.request<any>(
				this.config.queries.update, 
				{ id, input }
			);
			const updatedItem = data[this.config.keys.update];

			// Update in list
			const index = this.items.findIndex(i => i.id === id);
			if (index !== -1) {
				this.items[index] = updatedItem;
			}

			// Update current view if applicable
			if (this.currentItem?.id === id) {
				this.currentItem = updatedItem;
			}

			return updatedItem;
		} catch (err: any) {
			this.error = err.message || "Failed to update item";
			throw err;
		} finally {
			this.isLoading = false;
		}
	}

	/**
	 * Delete an item (Optimistic UI update)
	 */
	async delete(id: string) {
		if (!this.config.queries.delete || !this.config.keys.delete) return;

		// 1. Snapshot previous state
		const previousItems = [...this.items];
		const previousCurrent = this.currentItem;

		// 2. Optimistic Update
		this.items = this.items.filter(i => i.id !== id);
		if (this.currentItem?.id === id) this.currentItem = null;

		try {
			// 3. Perform Operation
			await this.config.client.request(
				this.config.queries.delete, 
				{ id }
			);
		} catch (err: any) {
			// 4. Revert on failure
			this.items = previousItems;
			this.currentItem = previousCurrent;
			this.error = err.message || "Failed to delete item";
			console.error(err);
		}
	}
}