import { writable, get, type Writable } from 'svelte/store';
import { createLogger } from '$lib/utils/logger';

const log = createLogger('store');
import type { Project, Document, Doclink } from '@stratiqai/types-simple';
import type { ProjectDocumentLinkConnection, ProjectDocumentLink } from '$lib/types/cloud/app';

/**
 * Generic application state store for managing entity state
 * Supports single entity, collections, loading, and error states
 */
export interface AppStateStore<TEntity, TCollection = TEntity[]> {
	// Stores
	entity: Writable<TEntity | null>;
	collection: Writable<TCollection>;
	loading: Writable<boolean>;
	error: Writable<string | null>;

	// Entity operations
	set: (data: TEntity) => void;
	update: (updates: Partial<TEntity>) => void;
	clear: () => void;
	
	// Nested property operations - for updating nested objects/collections reactively
	updateNestedProperty: <K extends keyof TEntity>(key: K, value: TEntity[K]) => void;
	updateNestedPropertyWith: <K extends keyof TEntity>(key: K, updater: (current: TEntity[K] | undefined) => TEntity[K]) => void;

	// Collection operations
	setCollection: (items: TCollection) => void;
	addToCollection: (item: TEntity, getId?: (item: TEntity) => string | number) => void;
	updateInCollection: (item: Partial<TEntity> & { id: string | number }, getId?: (item: TEntity) => string | number) => void;
	removeFromCollection: (id: string | number, getId?: (item: TEntity) => string | number) => void;

	// State operations
	setLoading: (loadingState: boolean) => void;
	setError: (errorMessage: string | null) => void;
	reset: () => void;
}

/**
 * Creates a generic application state store
 * @param initialEntity - Initial entity value (default: null)
 * @param initialCollection - Initial collection value (default: empty array)
 */
export function createAppStateStore<TEntity, TCollection extends Array<TEntity> = TEntity[]>(
	initialEntity: TEntity | null = null,
	initialCollection: TCollection = [] as unknown as TCollection
): AppStateStore<TEntity, TCollection> {
	const entity = writable<TEntity | null>(initialEntity);
	const collection = writable<TCollection>(initialCollection);
	const loading = writable<boolean>(false);
	const error = writable<string | null>(null);

	// Default ID getter - assumes entity has an 'id' property
	const defaultGetId = (item: TEntity): string | number => {
		return (item as any).id;
	};

	return {
		entity,
		collection,
		loading,
		error,

		set: (data: TEntity) => {
			entity.set(data);
			error.set(null);
		},

		update: (updates: Partial<TEntity>) => {
			entity.update(current => {
				if (current) {
					return { ...current, ...updates } as TEntity;
				}
				return current;
			});
		},

		clear: () => {
			entity.set(null);
			error.set(null);
		},

		updateNestedProperty: <K extends keyof TEntity>(key: K, value: TEntity[K]) => {
			entity.update(current => {
				if (current) {
					return { ...current, [key]: value } as TEntity;
				}
				return current;
			});
		},

		updateNestedPropertyWith: <K extends keyof TEntity>(key: K, updater: (current: TEntity[K] | undefined) => TEntity[K]) => {
			entity.update(current => {
				if (current) {
					const currentValue = current[key];
					const newValue = updater(currentValue);
					return { ...current, [key]: newValue } as TEntity;
				}
				return current;
			});
		},

		setCollection: (items: TCollection) => {
			collection.set(items);
		},

		addToCollection: (item: TEntity, getId: (item: TEntity) => string | number = defaultGetId) => {
			collection.update(current => {
				const existingIndex = current.findIndex((existing: TEntity) => getId(existing) === getId(item));
				if (existingIndex >= 0) {
					// Update existing item
					const updated = [...current] as TCollection;
					updated[existingIndex] = { ...updated[existingIndex], ...item } as TEntity;
					return updated;
				} else {
					// Add new item
					return [...current, item] as TCollection;
				}
			});
		},

		updateInCollection: (updates: Partial<TEntity> & { id: string | number }, getId: (item: TEntity) => string | number = defaultGetId) => {
			collection.update(current => {
				const existingIndex = current.findIndex((existing: TEntity) => getId(existing) === updates.id);
				if (existingIndex >= 0) {
					const updated = [...current] as TCollection;
					updated[existingIndex] = { ...updated[existingIndex], ...updates } as TEntity;
					return updated;
				}
				return current;
			});
		},

		removeFromCollection: (id: string | number, getId: (item: TEntity) => string | number = defaultGetId) => {
			collection.update(current => {
				return current.filter((item: TEntity) => getId(item) !== id) as TCollection;
			});
		},

		setLoading: (loadingState: boolean) => {
			loading.set(loadingState);
		},

		setError: (errorMessage: string | null) => {
			error.set(errorMessage);
			loading.set(false);
		},

		reset: () => {
			entity.set(null);
			collection.set([] as unknown as TCollection);
			loading.set(false);
			error.set(null);
		}
	};
}

/**
 * Dumps the contents of an AppStateStore to the console
 * @param store - The store instance to dump
 * @param label - Optional label to identify the dump in the console
 */
export function dumpStore<TEntity, TCollection>(
	store: AppStateStore<TEntity, TCollection>,
	label: string = 'Store'
): void {
	const entity = get(store.entity);
	const collection = get(store.collection);
	const loading = get(store.loading);
	const error = get(store.error);

	log.debug(`${label} dump`, {
		entity,
		collection,
		collectionLength: Array.isArray(collection) ? collection.length : 'N/A',
		loading,
		error
	});
}

// Create project-specific store instance (maintains backward compatibility)
export const projectStore = createAppStateStore<Project, Document[]>(null, []);

// Export stores for backward compatibility
export const project = projectStore.entity;
export const documents = projectStore.collection;
export const loading = projectStore.loading;
export const error = projectStore.error;

// Export helper functions for backward compatibility
export const setProject = projectStore.set;
export const updateProject = projectStore.update;
export const setDocuments = projectStore.setCollection;
export const addDocument = projectStore.addToCollection;

// Export nested property update functions for project store
export const updateProjectNestedProperty = projectStore.updateNestedProperty;
export const updateProjectNestedPropertyWith = projectStore.updateNestedPropertyWith;

/**
 * Helper functions for managing projectDocumentLinks
 * These functions handle both ProjectDocumentLinkConnection and ProjectDocumentLink[] formats
 */

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
 */
export function setProjectDocumentLinks(
	links: ProjectDocumentLinkConnection | ProjectDocumentLink[] | null
): void {
	// Normalize to ProjectDocumentLinkConnection format for consistency
	const normalized = normalizeProjectDocumentLinks(links);
	projectStore.updateNestedProperty('projectDocumentLinks', normalized);
}

/**
 * Add a ProjectDocumentLink to the projectDocumentLinks collection
 * Handles both Connection and array formats
 */
export function addProjectDocumentLink(link: ProjectDocumentLink): void {
	projectStore.updateNestedPropertyWith('projectDocumentLinks', (current) => {
		const items = getProjectDocumentLinkItems(current);
		const normalized = normalizeProjectDocumentLinks(current);
		
		// Check if link already exists
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
 */
export function updateProjectDocumentLink(
	id: string,
	updates: Partial<ProjectDocumentLink>
): void {
	projectStore.updateNestedPropertyWith('projectDocumentLinks', (current) => {
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
 */
export function removeProjectDocumentLink(id: string): void {
	projectStore.updateNestedPropertyWith('projectDocumentLinks', (current) => {
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

// export const addPageToDocument = (docHash: string, newPage: Page) => {
// 	documents.update(currentDocs => {
// 		return currentDocs.map(doc => {
// 			if (doc.id === docHash) {
// 				const existingPages = doc.pages?.items || [];
// 				const existingIndex = existingPages.findIndex(page => page.id === newPage.id);
				
// 				let updatedPages;
// 				if (existingIndex >= 0) {
// 					// Update existing page
// 					updatedPages = [...existingPages];
// 					updatedPages[existingIndex] = { ...updatedPages[existingIndex], ...newPage };
// 				} else {
// 					// Add new page
// 					updatedPages = [...existingPages, newPage];
// 				}
				
// 				return {
// 					...doc,
// 					pages: { items: updatedPages }
// 				};
// 			}
// 			return doc;
// 		});
// 	});
// };

// export const addTextToDocument = (docHash: string, newText: Text) => {
// 	documents.update(currentDocs => {
// 		return currentDocs.map(doc => {
// 			if (doc.docHash === docHash) {
// 				const existingTexts = doc.texts?.items || [];
// 				const existingIndex = existingTexts.findIndex(text => text.id === newText.id);
				
// 				let updatedTexts;
// 				if (existingIndex >= 0) {
// 					// Update existing text
// 					updatedTexts = [...existingTexts];
// 					updatedTexts[existingIndex] = { ...updatedTexts[existingIndex], ...newText };
// 				} else {
// 					// Add new text
// 					updatedTexts = [...existingTexts, newText];
// 				}
				
// 				return {
// 					...doc,
// 					texts: { items: updatedTexts }
// 				};
// 			}
// 			return doc;
// 		});
// 	});
// };

// export const addImageToDocument = (docHash: string, newImage: Image) => {
// 	documents.update(currentDocs => {
// 		return currentDocs.map(doc => {
// 			if (doc.docHash === docHash) {
// 				// For now, we'll store images in a separate property
// 				// This might need to be adjusted based on your Document type structure
// 				const existingImages = (doc as any).images?.items || [];
// 				const existingIndex = existingImages.findIndex(image => image.id === newImage.id);
				
// 				let updatedImages;
// 				if (existingIndex >= 0) {
// 					// Update existing image
// 					updatedImages = [...existingImages];
// 					updatedImages[existingIndex] = { ...updatedImages[existingIndex], ...newImage };
// 				} else {
// 					// Add new image
// 					updatedImages = [...existingImages, newImage];
// 				}
				
// 				return {
// 					...doc,
// 					images: { items: updatedImages }
// 				};
// 			}
// 			return doc;
// 		});
// 	});
// };

// export const addInsightToDocument = (docHash: string, newInsight: Insight) => {
// 	documents.update(currentDocs => {
// 		return currentDocs.map(doc => {
// 			if (doc.docHash === docHash) {
// 				const existingInsights = doc.insights?.items || [];
// 				const existingIndex = existingInsights.findIndex(insight => insight.hash === newInsight.hash);
				
// 				let updatedInsights;
// 				if (existingIndex >= 0) {
// 					// Update existing insight
// 					updatedInsights = [...existingInsights];
// 					updatedInsights[existingIndex] = { ...updatedInsights[existingIndex], ...newInsight };
// 				} else {
// 					// Add new insight
// 					updatedInsights = [...existingInsights, newInsight];
// 				}
				
// 				return {
// 					...doc,
// 					insights: { items: updatedInsights }
// 				};
// 			}
// 			return doc;
// 		});
// 	});
// };

// export const setLoading = (loadingState: boolean) => {
// 	loading.set(loadingState);
// };

// export const setError = (errorMessage: string | null) => {
// 	error.set(errorMessage);
// 	loading.set(false);
// };

// export const clear = () => {
// 	project.set(null);
// 	loading.set(false);
// 	error.set(null);
// };

/**
 * For comprehensive usage documentation, see:
 * @see {@link ../../docs/application_stores/appStateStore.md}
 */
