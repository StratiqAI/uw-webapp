/**
 * Project Store
 * 
 * Project-specific store instance and helper functions.
 * Uses the generic AppStateStore for project and document management.
 */

import { AppStateStore } from './appStateStore.svelte';
import type { Project, Document } from '@stratiqai/types-simple';
import type { ProjectDocumentLinkConnection, ProjectDocumentLink } from '$lib/types/cloud/app';

/**
 * Project-specific store instance
 * Manages the current project and its documents
 */
export const projectStore = new AppStateStore<Project, Document[]>();

// ============================================================================
// Helper functions for ProjectDocumentLinks
// ============================================================================

/**
 * Normalize projectDocumentLinks to ProjectDocumentLinkConnection format
 */
function normalizeProjectDocumentLinks(
	links: ProjectDocumentLinkConnection | ProjectDocumentLink[] | null | undefined
): ProjectDocumentLinkConnection | null {
	if (!links) return null;
	if (Array.isArray(links)) {
		return { items: links };
	}
	return links;
}

/**
 * Get the items array from projectDocumentLinks (handles both formats)
 */
function getProjectDocumentLinkItems(
	links: ProjectDocumentLinkConnection | ProjectDocumentLink[] | null | undefined
): ProjectDocumentLink[] {
	const normalized = normalizeProjectDocumentLinks(links);
	return normalized?.items || [];
}

/**
 * Set the entire projectDocumentLinks property
 * Note: Uses type assertion since projectDocumentLinks is a custom extension
 */
export function setProjectDocumentLinks(
	links: ProjectDocumentLinkConnection | ProjectDocumentLink[] | null
): void {
	const normalized = normalizeProjectDocumentLinks(links);
	// Type assertion needed because projectDocumentLinks is not in the base Project type
	projectStore.updateNestedProperty('projectDocumentLinks' as keyof Project, normalized as any);
}

/**
 * Add a ProjectDocumentLink to the projectDocumentLinks collection
 * Note: Uses type assertion since projectDocumentLinks is a custom extension
 */
export function addProjectDocumentLink(link: ProjectDocumentLink): void {
	projectStore.updateNestedPropertyWith('projectDocumentLinks' as keyof Project, (current: any) => {
		const items = getProjectDocumentLinkItems(current);
		const normalized = normalizeProjectDocumentLinks(current);
		
		const existingIndex = items.findIndex((item) => item.id === link.id);
		if (existingIndex >= 0) {
			// Update existing link
			const updatedItems = [...items];
			updatedItems[existingIndex] = { ...updatedItems[existingIndex], ...link };
			return normalized
				? { ...normalized, items: updatedItems }
				: ({ items: updatedItems } as ProjectDocumentLinkConnection);
		} else {
			// Add new link
			const updatedItems = [...items, link];
			return normalized
				? { ...normalized, items: updatedItems }
				: ({ items: updatedItems } as ProjectDocumentLinkConnection);
		}
	});
}

/**
 * Update a ProjectDocumentLink in the projectDocumentLinks collection
 * Note: Uses type assertion since projectDocumentLinks is a custom extension
 */
export function updateProjectDocumentLink(id: string, updates: Partial<ProjectDocumentLink>): void {
	projectStore.updateNestedPropertyWith('projectDocumentLinks' as keyof Project, (current: any) => {
		const items = getProjectDocumentLinkItems(current);
		const normalized = normalizeProjectDocumentLinks(current);
		
		const existingIndex = items.findIndex((item) => item.id === id);
		if (existingIndex >= 0) {
			const updatedItems = [...items];
			updatedItems[existingIndex] = { ...updatedItems[existingIndex], ...updates };
			return normalized
				? { ...normalized, items: updatedItems }
				: ({ items: updatedItems } as ProjectDocumentLinkConnection);
		}
		return current || null;
	});
}

/**
 * Remove a ProjectDocumentLink from the projectDocumentLinks collection
 * Note: Uses type assertion since projectDocumentLinks is a custom extension
 */
export function removeProjectDocumentLink(id: string): void {
	projectStore.updateNestedPropertyWith('projectDocumentLinks' as keyof Project, (current: any) => {
		const items = getProjectDocumentLinkItems(current);
		const normalized = normalizeProjectDocumentLinks(current);
		
		const filteredItems = items.filter((item) => item.id !== id);
		
		if (filteredItems.length === 0) {
			return null;
		}
		
		return normalized
			? { ...normalized, items: filteredItems }
			: ({ items: filteredItems } as ProjectDocumentLinkConnection);
	});
}

// ============================================================================
// Backward compatibility exports (for gradual migration)
// ============================================================================

/**
 * @deprecated Use `projectStore.entity` directly instead
 * This export is for backward compatibility only
 */
export const setProject = (data: Project) => projectStore.set(data);

/**
 * @deprecated Use `projectStore.update()` instead
 */
export const updateProject = (updates: Partial<Project>) => projectStore.update(updates);

/**
 * @deprecated Use `projectStore.setCollection()` instead
 */
export const setDocuments = (items: Document[]) => projectStore.setCollection(items);

/**
 * @deprecated Use `projectStore.addToCollection()` instead
 * Note: This adds a Document to the documents collection, not the project entity
 */
export const addDocument = (item: Document) => {
	// Type assertion needed because Document is not the same as Project
	projectStore.addToCollection(item as any, (doc: any) => doc.id);
};

/**
 * @deprecated Use `projectStore.updateNestedProperty()` instead
 */
export const updateProjectNestedProperty = <K extends keyof Project>(key: K, value: Project[K]) =>
	projectStore.updateNestedProperty(key, value);

/**
 * @deprecated Use `projectStore.updateNestedPropertyWith()` instead
 */
export const updateProjectNestedPropertyWith = <K extends keyof Project>(
	key: K,
	updater: (current: Project[K] | undefined) => Project[K]
) => projectStore.updateNestedPropertyWith(key, updater);
