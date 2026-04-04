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
 * Create a standard entity sync configuration for Prompts
 */
export function createPromptSyncConfig(
	listQuery: string | any,
	getQuery: string | any,
	updateSubscription: string | any,
	deleteSubscription: string | any,
	createSubscription?: string | any
): EntitySyncConfig {
	return {
		entityType: 'prompts',
		listQuery,
		getQuery,
		createSubscription,
		updateSubscription,
		deleteSubscription,
		listResponsePath: 'listPrompts.items',
		getResponsePath: 'getPrompt',
		createSubscriptionPath: 'onCreatePrompt',
		updateSubscriptionPath: 'onUpdatePrompt',
		deleteSubscriptionPath: 'onDeletePrompt',
		getEntityId: (prompt: any) => prompt.id
	};
}

/**
 * Create a standard entity sync configuration for Workflows
 */
export function createWorkflowSyncConfig(
	listQuery: string | any,
	getQuery: string | any,
	updateSubscription: string | any,
	deleteSubscription: string | any,
	createSubscription?: string | any
): EntitySyncConfig {
	return {
		entityType: 'workflows',
		listQuery,
		getQuery,
		createSubscription,
		updateSubscription,
		deleteSubscription,
		listResponsePath: 'listWorkflows.items',
		getResponsePath: 'getWorkflow',
		createSubscriptionPath: 'onCreateWorkflow',
		updateSubscriptionPath: 'onUpdateWorkflow',
		deleteSubscriptionPath: 'onDeleteWorkflow',
		getEntityId: (workflow: any) => workflow.id
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
	buildListVariables?: (options?: Record<string, any>) => Record<string, any>;
	buildGetVariables?: (id: string) => Record<string, any>;
	buildCreateVariables?: (options?: Record<string, any>) => Record<string, any>;
	buildUpdateVariables?: (id: string) => Record<string, any>;
	buildDeleteVariables?: (id: string) => Record<string, any>;
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
