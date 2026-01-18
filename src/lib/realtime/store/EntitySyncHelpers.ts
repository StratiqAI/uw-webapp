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
	deleteSubscription: string | any,
	createSubscription?: string | any
): EntitySyncConfig {
	return {
		entityType: 'projects',
		listQuery,
		getQuery,
		createSubscription,
		updateSubscription,
		deleteSubscription,
		listResponsePath: 'listProjects.items',
		getResponsePath: 'getProject',
		createSubscriptionPath: 'onCreateProject',
		updateSubscriptionPath: 'onUpdateProject',
		deleteSubscriptionPath: 'onDeleteProject',
		getEntityId: (project: any) => project.id
	};
}

/**
 * Create a standard entity sync configuration for PromptTemplates
 */
export function createPromptTemplateSyncConfig(
	listQuery: string | any,
	getQuery: string | any,
	updateSubscription: string | any,
	deleteSubscription: string | any,
	createSubscription?: string | any
): EntitySyncConfig {
	return {
		entityType: 'promptTemplates',
		listQuery,
		getQuery,
		createSubscription,
		updateSubscription,
		deleteSubscription,
		listResponsePath: 'listPromptTemplates.items',
		getResponsePath: 'getPromptTemplate',
		createSubscriptionPath: 'onCreatePromptTemplate',
		updateSubscriptionPath: 'onUpdatePromptTemplate',
		deleteSubscriptionPath: 'onDeletePromptTemplate',
		getEntityId: (promptTemplate: any) => promptTemplate.id
	};
}

/**
 * Generic helper to create entity sync configuration
 */
export function createEntitySyncConfig<T extends { id: string }>(config: {
	entityType: string;
	listQuery: string | any;
	getQuery: string | any;
	createSubscription?: string | any;
	updateSubscription: string | any;
	deleteSubscription: string | any;
	listResponsePath?: string;
	getResponsePath?: string;
	createSubscriptionPath?: string;
	updateSubscriptionPath?: string;
	deleteSubscriptionPath?: string;
	buildCreateVariables?: () => Record<string, any>;
	onUpdate?: (entity: T) => void;
	onDelete?: (entity: T) => void;
	onCreate?: (entity: T) => void;
	onSubscriptionError?: (error: any, entityId: string | null, operation: 'create' | 'update' | 'delete') => void;
}): EntitySyncConfig<T> {
	return {
		...config,
		getEntityId: (entity: T) => entity.id
	};
}
