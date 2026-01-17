/**
 * EntitySyncConfig
 * 
 * Interfaces for configuring entity synchronization with GraphQL queries and subscriptions.
 * 
 * These interfaces simplify the process of:
 * - Querying for entities (list or single)
 * - Setting up update and delete subscriptions
 * - Publishing to ValidatedTopicStore
 * - Managing subscription lifecycle
 */

import type { DocumentNode } from 'graphql';

/**
 * Configuration for synchronizing a specific entity type
 */
export interface EntitySyncConfig<T = any> {
	/** Entity type name (e.g., 'projects', 'doclinks', 'tasks') */
	entityType: string;
	
	/** GraphQL query for fetching list of entities */
	listQuery: string | DocumentNode;
	
	/** GraphQL query for fetching a single entity by ID */
	getQuery: string | DocumentNode;
	
	/** GraphQL subscription query for entity creates */
	createSubscription?: string | DocumentNode;
	
	/** GraphQL subscription query for entity updates */
	updateSubscription: string | DocumentNode;
	
	/** GraphQL subscription query for entity deletes */
	deleteSubscription: string | DocumentNode;
	
	/** Path to extract data from list query response (e.g., 'listProjects.items') */
	listResponsePath?: string;
	
	/** Path to extract data from get query response (e.g., 'getProject') */
	getResponsePath?: string;
	
	/** Path to extract data from create subscription payload (e.g., 'onCreateProject') */
	createSubscriptionPath?: string;
	
	/** Path to extract data from update subscription payload (e.g., 'onUpdateProject') */
	updateSubscriptionPath?: string;
	
	/** Path to extract data from delete subscription payload (e.g., 'onDeleteProject') */
	deleteSubscriptionPath?: string;
	
	/** Function to extract entity ID from entity object */
	getEntityId: (entity: T) => string;
	
	/** Optional function to build query variables for list query */
	buildListVariables?: (options?: Record<string, any>) => Record<string, any>;
	
	/** Optional function to build query variables for get query */
	buildGetVariables?: (id: string) => Record<string, any>;
	
	/** Optional function to build subscription variables for create */
	buildCreateVariables?: () => Record<string, any>;
	
	/** Optional function to build subscription variables for update */
	buildUpdateVariables?: (id: string) => Record<string, any>;
	
	/** Optional function to build subscription variables for delete */
	buildDeleteVariables?: (id: string) => Record<string, any>;
	
	/** Optional callback when entity is created via subscription */
	onCreate?: (entity: T) => void;
	
	/** Optional callback when entity is updated via subscription */
	onUpdate?: (entity: T) => void;
	
	/** Optional callback when entity is deleted via subscription */
	onDelete?: (entity: T) => void;
	
	/** Optional error handler for subscriptions */
	onSubscriptionError?: (error: any, entityId: string | null, operation: 'create' | 'update' | 'delete') => void;
}

/**
 * Options for querying and syncing entities
 */
export interface EntitySyncOptions {
	/** Query variables for list query */
	queryVariables?: Record<string, any>;
	
	/** Whether to set up subscriptions after querying */
	setupSubscriptions?: boolean;
	
	/** Whether to clear existing data before syncing */
	clearExisting?: boolean;
}

/**
 * Result of syncing entities
 */
export interface EntitySyncResult<T = any> {
	/** Entities that were synced */
	entities: T[];
	
	/** Number of entities synced */
	count: number;
	
	/** Whether subscriptions were set up */
	subscriptionsEnabled: boolean;
}
