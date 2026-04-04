/**
 * Project Entities Store
 * 
 * Reactive store for managing text, table, and image entities for a project.
 * This store is used to display real-time updates when entities are created
 * via GraphQL subscriptions.
 */

import { writable, derived, type Writable, type Readable } from 'svelte/store';
import type { Text, Table, Image } from '@stratiqai/types-simple';

interface ProjectEntities {
	texts: Text[];
	tables: Table[];
	images: Image[];
}

// Store for each project's entities (keyed by projectId)
const projectEntitiesMap = new Map<string, Writable<ProjectEntities>>();

/**
 * Get or create a store for a specific project's entities
 */
export function getProjectEntitiesStore(projectId: string): Writable<ProjectEntities> {
	if (!projectEntitiesMap.has(projectId)) {
		projectEntitiesMap.set(projectId, writable<ProjectEntities>({
			texts: [],
			tables: [],
			images: []
		}));
	}
	return projectEntitiesMap.get(projectId)!;
}

/**
 * Add a text entity to a project's store
 */
export function addProjectText(projectId: string, text: Text): void {
	const store = getProjectEntitiesStore(projectId);
	store.update((entities) => {
		// Check if text already exists (by id)
		const existingIndex = entities.texts.findIndex((t) => t.id === text.id);
		if (existingIndex >= 0) {
			// Update existing
			entities.texts[existingIndex] = text;
		} else {
			// Add new (prepend for recent-first ordering)
			entities.texts = [text, ...entities.texts];
		}
		return entities;
	});
}

/**
 * Add a table entity to a project's store
 */
export function addProjectTable(projectId: string, table: Table): void {
	const store = getProjectEntitiesStore(projectId);
	store.update((entities) => {
		// Check if table already exists (by id)
		const existingIndex = entities.tables.findIndex((t) => t.id === table.id);
		if (existingIndex >= 0) {
			// Update existing
			entities.tables[existingIndex] = table;
		} else {
			// Add new (prepend for recent-first ordering)
			entities.tables = [table, ...entities.tables];
		}
		return entities;
	});
}

/**
 * Add an image entity to a project's store
 */
export function addProjectImage(projectId: string, image: Image): void {
	const store = getProjectEntitiesStore(projectId);
	store.update((entities) => {
		// Check if image already exists (by id)
		const existingIndex = entities.images.findIndex((i) => i.id === image.id);
		if (existingIndex >= 0) {
			// Update existing
			entities.images[existingIndex] = image;
		} else {
			// Add new (prepend for recent-first ordering)
			entities.images = [image, ...entities.images];
		}
		return entities;
	});
}

/**
 * Get derived stores for individual entity types
 */
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
 * Deduplicate an array of entities by `id`, keeping the first occurrence.
 */
function dedup<T extends { id: string }>(items: T[]): T[] {
	const seen = new Set<string>();
	return items.filter((item) => {
		if (seen.has(item.id)) return false;
		seen.add(item.id);
		return true;
	});
}

/**
 * Batch-set all entities for a project in a single store update.
 * Avoids N individual store.update() calls that each trigger re-renders.
 * Deduplicates by id to guard against duplicate entries from the API.
 */
export function setProjectEntities(
	projectId: string,
	entities: { texts: Text[]; tables: Table[]; images: Image[] }
): void {
	const store = getProjectEntitiesStore(projectId);
	store.set({
		texts: dedup(entities.texts),
		tables: dedup(entities.tables),
		images: dedup(entities.images)
	});
}

/**
 * Clear entities for a project (useful when switching projects)
 */
export function clearProjectEntities(projectId: string): void {
	const store = getProjectEntitiesStore(projectId);
	store.set({
		texts: [],
		tables: [],
		images: []
	});
}
