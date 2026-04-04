/**
 * Project Entities Store
 * 
 * Reactive store for managing text, table, and image entities for a project.
 * This store is used to display real-time updates when entities are created
 * via GraphQL subscriptions.
 * 
 * Migrated to Svelte 5 runes pattern
 */

import type { Text, Table, Image } from '@stratiqai/types-simple';
import { writable, type Writable } from 'svelte/store';

interface ProjectEntities {
	texts: Text[];
	tables: Table[];
	images: Image[];
}

// Store for each project's entities (keyed by projectId)
// Using a Map with rune-based state
const projectEntitiesMap = new Map<string, {
	state: {
		texts: Text[];
		tables: Table[];
		images: Image[];
	};
	store: Writable<ProjectEntities>;
}>();

/**
 * Get or create a store for a specific project's entities
 */
export function getProjectEntitiesStore(projectId: string): Writable<ProjectEntities> {
	if (!projectEntitiesMap.has(projectId)) {
		const initialState: ProjectEntities = {
			texts: [],
			tables: [],
			images: []
		};
		
		// Create rune-based state
		const state = $state(initialState);
		
		// Create writable store for backward compatibility
		const store = writable<ProjectEntities>(initialState);
		
		// Sync store with state changes
		// Note: We'll update the store when state changes via the helper functions
		projectEntitiesMap.set(projectId, { state, store });
	}
	return projectEntitiesMap.get(projectId)!.store;
}

/**
 * Get the rune-based state for a project (for direct access)
 */
function getProjectEntitiesState(projectId: string): ProjectEntities {
	if (!projectEntitiesMap.has(projectId)) {
		getProjectEntitiesStore(projectId); // Initialize if needed
	}
	return projectEntitiesMap.get(projectId)!.state;
}

/**
 * Sync state to store
 */
function syncStateToStore(projectId: string) {
	const entry = projectEntitiesMap.get(projectId);
	if (entry) {
		entry.store.set({ ...entry.state });
	}
}

/**
 * Add a text entity to a project's store
 */
export function addProjectText(projectId: string, text: Text): void {
	const state = getProjectEntitiesState(projectId);
	
	// Check if text already exists (by id)
	const existingIndex = state.texts.findIndex((t) => t.id === text.id);
	if (existingIndex >= 0) {
		// Update existing
		state.texts = state.texts.map((t, i) => i === existingIndex ? text : t);
	} else {
		// Add new (prepend for recent-first ordering)
		state.texts = [text, ...state.texts];
	}
	
	syncStateToStore(projectId);
}

/**
 * Add a table entity to a project's store
 */
export function addProjectTable(projectId: string, table: Table): void {
	const state = getProjectEntitiesState(projectId);
	
	// Check if table already exists (by id)
	const existingIndex = state.tables.findIndex((t) => t.id === table.id);
	if (existingIndex >= 0) {
		// Update existing
		state.tables = state.tables.map((t, i) => i === existingIndex ? table : t);
	} else {
		// Add new (prepend for recent-first ordering)
		state.tables = [table, ...state.tables];
	}
	
	syncStateToStore(projectId);
}

/**
 * Add an image entity to a project's store
 */
export function addProjectImage(projectId: string, image: Image): void {
	const state = getProjectEntitiesState(projectId);
	
	// Check if image already exists (by id)
	const existingIndex = state.images.findIndex((i) => i.id === image.id);
	if (existingIndex >= 0) {
		// Update existing
		state.images = state.images.map((i, idx) => idx === existingIndex ? image : i);
	} else {
		// Add new (prepend for recent-first ordering)
		state.images = [image, ...state.images];
	}
	
	syncStateToStore(projectId);
}

/**
 * Get derived stores for individual entity types
 * These return readable stores that track the rune state
 */
import { derived, type Readable } from 'svelte/store';

export function getProjectTextsStore(projectId: string): Readable<Text[]> {
	const store = getProjectEntitiesStore(projectId);
	return derived(store, ($entities) => $entities.texts);
}

export function getProjectTablesStore(projectId: string): Readable<Table[]> {
	const store = getProjectEntitiesStore(projectId);
	return derived(store, ($entities) => $entities.tables);
}

export function getProjectImagesStore(projectId: string): Readable<Image[]> {
	const store = getProjectEntitiesStore(projectId);
	return derived(store, ($entities) => $entities.images);
}

/**
 * Clear entities for a project (useful when switching projects)
 */
export function clearProjectEntities(projectId: string): void {
	const state = getProjectEntitiesState(projectId);
	state.texts = [];
	state.tables = [];
	state.images = [];
	syncStateToStore(projectId);
}
