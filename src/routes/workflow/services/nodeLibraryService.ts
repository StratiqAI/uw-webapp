import type { ElementType } from '../types/node';
import { elementTypes } from './nodeDefinitions';

/**
 * Get all default element types
 */
export function getElementTypes(): ElementType[] {
	return elementTypes;
}

/**
 * Get all element types including custom ones
 */
export function getAllElementTypes(customNodes: ElementType[] = []): ElementType[] {
	return [...getElementTypes(), ...customNodes];
}

/**
 * Get an element type by its ID
 */
export function getElementTypeById(id: string): ElementType | undefined {
	return elementTypes.find((type) => type.id === id);
}
