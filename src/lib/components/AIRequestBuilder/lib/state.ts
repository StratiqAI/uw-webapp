// src/lib/state.ts

export const STORAGE_KEY = 'openai-responses-builder-state';

// JSON Schema types
export type PropertyType = 'string' | 'number' | 'boolean' | 'integer' | 'object' | 'array';

export interface SchemaProperty {
	id: string;
	name: string;
	type: PropertyType;
	description?: string;
	required: boolean;
	// For arrays
	itemType?: PropertyType;
	itemProperties?: SchemaProperty[];
	// For objects
	properties?: SchemaProperty[];
}

export type Message = {
	role: 'system' | 'user';
	content: string;
	id: string;
};

export interface SavedState {
	model: string;
	schemaName: string;
	strict: boolean;
	messages: Message[];
	vectorStoreIds: string[];
	properties: SchemaProperty[];
}

// Load state from localStorage
export function loadState(): SavedState | null {
	if (typeof window === 'undefined') return null;
	try {
		const saved = localStorage.getItem(STORAGE_KEY);
		if (saved) {
			return JSON.parse(saved);
		}
	} catch (error) {
		console.error('Failed to load state from localStorage:', error);
	}
	return null;
}

// Save state to localStorage
export function saveState(state: SavedState) {
	if (typeof window === 'undefined') return;
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
	} catch (error) {
		console.error('Failed to save state to localStorage:', error);
	}
}