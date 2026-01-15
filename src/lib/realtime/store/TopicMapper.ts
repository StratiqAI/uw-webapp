/**
 * TopicMapper
 * 
 * Utility functions for mapping GraphQL data structures to ValidatedTopicStore topic paths.
 * 
 * These are pure functions that transform entity types and IDs into MQTT-style topic paths
 * compatible with the ValidatedTopicStore pattern system.
 * 
 * Examples:
 *   toTopicPath('projects', 'proj-123') -> 'projects/proj-123'
 *   toNestedTopicPath('projects/proj-123', 'doclinks', 'doc-456') -> 'projects/proj-123/doclinks/doc-456'
 *   extractTopicPath({ id: 'proj-123', name: 'My Project' }, 'projects') -> 'projects/proj-123'
 */

/**
 * Convert entity type and ID to a topic path
 * 
 * @param entityType - The entity type (e.g., 'projects', 'doclinks', 'tasks')
 * @param id - The entity ID
 * @returns Topic path (e.g., 'projects/proj-123')
 */
export function toTopicPath(entityType: string, id: string): string {
	if (!entityType || !id) {
		throw new Error('Entity type and ID are required');
	}
	return `${entityType}/${id}`;
}

/**
 * Build a nested topic path for child entities
 * 
 * @param parentPath - Parent topic path (e.g., 'projects/proj-123')
 * @param childType - Child entity type (e.g., 'doclinks', 'tasks')
 * @param childId - Child entity ID
 * @returns Nested topic path (e.g., 'projects/proj-123/doclinks/doc-456')
 */
export function toNestedTopicPath(parentPath: string, childType: string, childId: string): string {
	if (!parentPath || !childType || !childId) {
		throw new Error('Parent path, child type, and child ID are required');
	}
	return `${parentPath}/${childType}/${childId}`;
}

/**
 * Extract topic path from a GraphQL entity object
 * 
 * @param entity - The entity object (must have an 'id' field)
 * @param entityType - The entity type
 * @param parentPath - Optional parent path for nested entities
 * @returns Topic path for the entity
 */
export function extractTopicPath(entity: any, entityType: string, parentPath?: string): string {
	if (!entity || !entity.id) {
		throw new Error('Entity must have an id field');
	}
	
	if (parentPath) {
		return toNestedTopicPath(parentPath, entityType, entity.id);
	}
	return toTopicPath(entityType, entity.id);
}

/**
 * Extract base path from a schema pattern by removing wildcards
 * 
 * Examples:
 *   'projects/+' -> 'projects'
 *   'projects/+/doclinks/+' -> 'projects'
 * 
 * @param pattern - Schema pattern with wildcards (e.g., 'projects/+')
 * @returns Base path without wildcards
 */
export function getBasePathFromPattern(pattern: string): string {
	if (!pattern) return '';
	return pattern.replace(/\/[+#]$/, '').replace(/\/[+#]\/.*$/, '');
}

/**
 * Build schema pattern for an entity type
 * 
 * @param entityType - The entity type
 * @returns Schema pattern (e.g., 'projects/+')
 */
export function buildSchemaPattern(entityType: string): string {
	return `${entityType}/+`;
}

/**
 * Build schema pattern for nested child entities
 * 
 * @param parentType - Parent entity type
 * @param childType - Child entity type
 * @returns Schema pattern (e.g., 'projects/+/doclinks/+')
 */
export function buildNestedSchemaPattern(parentType: string, childType: string): string {
	return `${parentType}/+/${childType}/+`;
}
