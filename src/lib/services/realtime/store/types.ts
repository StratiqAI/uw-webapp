/**
 * Types for GraphQLStorePublisher
 */

import type { DocumentNode } from 'graphql';
import type { Schema } from 'ajv';
import type { SubscriptionSpec } from '../websocket/types';

/**
 * Configuration for syncing a project
 */
export interface ProjectSyncConfig {
	/** GraphQL query to fetch initial project data */
	query: string | DocumentNode;
	/** Variables for the query (typically { id: projectId }) */
	queryVariables?: Record<string, any>;
	/** GraphQL subscriptions to set up for real-time updates */
	subscriptions: SubscriptionConfig[];
	/** Schemas to register before syncing (optional) */
	schemas?: EntitySchemaConfig[];
}

/**
 * Configuration for a single subscription
 */
export interface SubscriptionConfig {
	/** GraphQL subscription query */
	query: string | DocumentNode;
	/** Variables for the subscription */
	variables?: Record<string, any>;
	/** Path to extract data from subscription payload (e.g., 'onUpdateProject') */
	path?: string;
	/** Entity type for mapping to topic path (e.g., 'projects', 'doclinks') */
	entityType: string;
	/** Optional parent entity type for nested entities (e.g., 'projects' for 'doclinks') */
	parentEntityType?: string;
	/** Handler for subscription data (optional, default handler will publish to store) */
	onData?: (data: any, topic: string) => void;
	/** Handler for subscription errors */
	onError?: (error: any) => void;
}

/**
 * Schema configuration for entity types
 */
export interface EntitySchemaConfig {
	/** Entity type name (e.g., 'projects', 'doclinks') */
	entityType: string;
	/** JSON Schema for validation */
	schema: Schema;
	/** Schema pattern (e.g., 'projects/+' or 'projects/+/doclinks/+') */
	pattern: string;
	/** Optional parent entity type for nested schemas */
	parentEntityType?: string;
}

/**
 * Options for GraphQLStorePublisher (legacy, kept for type compatibility)
 */
export interface GraphQLStorePublisherOptions {
	queryClient: import('./GraphQLQueryClient').IGraphQLQueryClient;
	subscriptionClient: import('../websocket/wsClient').AppSyncWsClient;
	store: {
		registerSchema(pattern: string, schema: Schema): void;
		publish<T = any>(topic: string, value: T): boolean;
		delete(topic: string): void;
		clearAllAt(path: string, options?: { exclude?: string[] }): void;
		getAllAt<T = any>(
			path: string,
			options?: {
				exclude?: string[];
				filter?: (key: string, value: any) => boolean;
				includePrimitives?: boolean;
			}
		): Array<{ id: string; data: T }>;
	};
}
