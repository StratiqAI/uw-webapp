import type { ElementType } from '../types/node';

// This will be populated with the full elementTypes array from +page.svelte
// For now, this is a placeholder structure. The actual elementTypes array
// should be moved here from the main component file.
// The array is very large (2000+ lines) containing all node definitions.

export function getElementTypes(): ElementType[] {
	// This should return the full elementTypes array
	// For now, return empty array - will be populated during refactoring
	return [];
}

// This function can be used to get all element types including custom ones
export function getAllElementTypes(customNodes: ElementType[] = []): ElementType[] {
	return [...getElementTypes(), ...customNodes];
}
