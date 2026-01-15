/**
 * EntitySyncHelpers
 * 
 * Helper functions for creating common entity sync configurations.
 * 
 * These helpers simplify creating EntitySyncConfig objects for common entity types.
 */

import type { EntitySyncConfig } from './EntitySyncConfig';

/**
 * Create a standard entity sync configuration for Projects
 */
export function createProjectSyncConfig(
	listQuery: string | any,
	getQuery: string | any,
	updateSubscription: string | any,
	deleteSubscription: string | any
): EntitySyncConfig {
	return {
		entityType: 'projects',
		listQuery,
		getQuery,
		updateSubscription,
		deleteSubscription,
		listResponsePath: 'listProjects.items',
		getResponsePath: 'getProject',
		updateSubscriptionPath: 'onUpdateProject',
		deleteSubscriptionPath: 'onDeleteProject',
		getEntityId: (project: any) => project.id
	};
}

/**
 * Generic helper to create entity sync configuration
 */
export function createEntitySyncConfig<T extends { id: string }>(config: {
	entityType: string;
	listQuery: string | any;
	getQuery: string | any;
	updateSubscription: string | any;
	deleteSubscription: string | any;
	listResponsePath?: string;
	getResponsePath?: string;
	updateSubscriptionPath?: string;
	deleteSubscriptionPath?: string;
	onUpdate?: (entity: T) => void;
	onDelete?: (entity: T) => void;
	onSubscriptionError?: (error: any, entityId: string, operation: 'update' | 'delete') => void;
}): EntitySyncConfig<T> {
	return {
		...config,
		getEntityId: (entity: T) => entity.id
	};
}
