/**
 * GraphQLStorePublisher
 * 
 * Orchestrator class that synchronizes GraphQL data (queries + subscriptions) with ValidatedTopicStore.
 * 
 * This class coordinates:
 * - GraphQL query execution for initial data load
 * - GraphQL subscription setup for real-time updates
 * - Data transformation and topic path mapping
 * - Publishing data to ValidatedTopicStore
 * - Schema registration coordination
 * - Project selection and cleanup
 * 
 * Architecture:
 * - Uses IGraphQLQueryClient for HTTP queries
 * - Uses AppSyncWsClient for WebSocket subscriptions
 * - Uses TopicMapper for path mapping
 * - Uses ValidatedTopicStore for data storage
 * 
 * Usage:
 * ```typescript
 * const publisher = new GraphQLStorePublisher({
 *   queryClient,
 *   subscriptionClient,
 *   store
 * });
 * 
 * await publisher.syncProject('proj-123', {
 *   query: PROJECT_QUERY,
 *   queryVariables: { id: 'proj-123' },
 *   subscriptions: [...],
 *   schemas: [...]
 * });
 * ```
 */

import type { DocumentNode } from 'graphql';
import type { Schema } from 'ajv';
import type {
	GraphQLStorePublisherOptions,
	ProjectSyncConfig,
	SubscriptionConfig,
	EntitySchemaConfig
} from './types';
import type { SubscriptionSpec } from '../websocket/types';
import type { IGraphQLQueryClient } from './GraphQLQueryClient';
import type { AppSyncWsClient } from '../websocket/AppSyncWsClient';
import {
	toTopicPath,
	toNestedTopicPath,
	extractTopicPath,
	buildSchemaPattern,
	buildNestedSchemaPattern
} from './TopicMapper';

/**
 * ValidatedTopicStore interface (to avoid circular dependency)
 */
interface IValidatedTopicStore {
	registerSchema(pattern: string, schema: Schema): void;
	publish<T = any>(topic: string, value: T): boolean;
	delete(topic: string): void;
	clearAllAt(path: string, options?: { exclude?: string[] }): void;
	getAllAt<T = any>(path: string, options?: { exclude?: string[]; filter?: (key: string, value: any) => boolean; includePrimitives?: boolean }): Array<{ id: string; data: T }>;
}

export class GraphQLStorePublisher {
	private queryClient: IGraphQLQueryClient;
	private subscriptionClient: AppSyncWsClient;
	private store: IValidatedTopicStore;
	private activeSubscriptions: Map<string, SubscriptionSpec<any>> = new Map();
	private currentProjectId: string | null = null;

	constructor(options: GraphQLStorePublisherOptions) {
		this.queryClient = options.queryClient;
		this.subscriptionClient = options.subscriptionClient;
		this.store = options.store;
	}

	/**
	 * Sync a project: load initial data and set up subscriptions
	 * 
	 * @param projectId - The project ID to sync
	 * @param config - Configuration for syncing (queries, subscriptions, schemas)
	 */
	async syncProject(projectId: string, config: ProjectSyncConfig): Promise<void> {
		// Clear previous project if different
		if (this.currentProjectId && this.currentProjectId !== projectId) {
			this.clearProject(this.currentProjectId);
		}

		this.currentProjectId = projectId;

		// 1. Register schemas if provided
		if (config.schemas) {
			this.registerSchemas(config.schemas);
		}

		// 2. Execute query to fetch initial data
		const queryVariables = config.queryVariables || { id: projectId };
		const queryResult = await this.queryClient.query(config.query, queryVariables);

		// 3. Transform and publish query results to store
		this.publishQueryResult(queryResult, projectId, config);

		// 4. Set up subscriptions for real-time updates
		this.setupSubscriptions(projectId, config.subscriptions);
	}

	/**
	 * Clear all data and subscriptions for a project
	 * 
	 * @param projectId - The project ID to clear
	 */
	clearProject(projectId: string): void {
		// Clear store data
		const projectPath = toTopicPath('projects', projectId);
		this.store.clearAllAt(projectPath);

		// Remove subscriptions
		this.removeAllSubscriptions();

		// Clear current project if it matches
		if (this.currentProjectId === projectId) {
			this.currentProjectId = null;
		}
	}

	/**
	 * Disconnect and clean up all subscriptions
	 */
	disconnect(): void {
		this.removeAllSubscriptions();
		this.currentProjectId = null;
	}

	/**
	 * Register schemas with the store
	 */
	private registerSchemas(schemas: EntitySchemaConfig[]): void {
		for (const schemaConfig of schemas) {
			this.store.registerSchema(schemaConfig.pattern, schemaConfig.schema);
		}
	}

	/**
	 * Publish query result data to the store
	 * 
	 * This method extracts the main entity and any nested entities from the query result
	 * and publishes them to appropriate topic paths.
	 */
	private publishQueryResult(queryResult: any, projectId: string, config: ProjectSyncConfig): void {
		// Extract the main project entity (assuming query returns { getProject: {...} })
		// This is a common pattern, but we need to handle different query structures
		const projectData = this.extractEntityData(queryResult);

		if (projectData) {
			// Publish project entity
			const projectTopic = toTopicPath('projects', projectId);
			this.store.publish(projectTopic, projectData);

			// Handle nested entities (e.g., doclinks)
			this.publishNestedEntities(projectData, projectTopic, config);
		}
	}

	/**
	 * Extract entity data from query result
	 * 
	 * Handles different GraphQL query result structures:
	 * - { getProject: {...} }
	 * - { project: {...} }
	 * - Direct entity object
	 */
	private extractEntityData(queryResult: any): any {
		if (!queryResult || typeof queryResult !== 'object') {
			return null;
		}

		// Try common GraphQL query result patterns
		if (queryResult.getProject) return queryResult.getProject;
		if (queryResult.project) return queryResult.project;
		if (queryResult.data) return queryResult.data;

		// If it's a direct entity object (has id), return it
		if (queryResult.id) {
			return queryResult;
		}

		// Otherwise, return the first object value
		const keys = Object.keys(queryResult);
		if (keys.length > 0) {
			return queryResult[keys[0]];
		}

		return null;
	}

	/**
	 * Publish nested entities (e.g., doclinks) to the store
	 * 
	 * Looks for common nested entity patterns in the project data
	 */
	private publishNestedEntities(projectData: any, projectTopic: string, config: ProjectSyncConfig): void {
		if (!projectData || typeof projectData !== 'object') return;

		// Common nested entity patterns to look for
		const nestedEntityFields = ['docLinks', 'doclinks', 'tasks', 'users', 'pages', 'workflows'];

		for (const field of nestedEntityFields) {
			const nestedData = projectData[field];
			
			if (Array.isArray(nestedData?.items)) {
				// Handle connection pattern: { items: [...], nextToken: ... }
				for (const item of nestedData.items) {
					if (item && item.id) {
						const childTopic = toNestedTopicPath(projectTopic, field.toLowerCase(), item.id);
						this.store.publish(childTopic, item);
					}
				}
			} else if (Array.isArray(nestedData)) {
				// Handle direct array pattern: [...]
				for (const item of nestedData) {
					if (item && item.id) {
						const childTopic = toNestedTopicPath(projectTopic, field.toLowerCase(), item.id);
						this.store.publish(childTopic, item);
					}
				}
			}
		}
	}

	/**
	 * Set up GraphQL subscriptions for real-time updates
	 */
	private setupSubscriptions(projectId: string, subscriptions: SubscriptionConfig[]): void {
		for (const subConfig of subscriptions) {
			const subscriptionSpec = this.createSubscriptionSpec(projectId, subConfig);
			
			// Store subscription for cleanup
			const subKey = `${subConfig.entityType}-${projectId}`;
			this.activeSubscriptions.set(subKey, subscriptionSpec);

			// Add subscription to client
			this.subscriptionClient.addSubscription(subscriptionSpec);
		}
	}

	/**
	 * Create a SubscriptionSpec from SubscriptionConfig
	 */
	private createSubscriptionSpec(projectId: string, config: SubscriptionConfig): SubscriptionSpec<any> {
		const projectTopic = toTopicPath('projects', projectId);

		return {
			query: config.query,
			variables: config.variables || { id: projectId },
			path: config.path,
			next: (data: any) => {
				if (config.onData) {
					// Use custom handler if provided
					const topic = this.buildTopicForEntity(data, config.entityType, config.parentEntityType, projectTopic);
					config.onData(data, topic);
				} else {
					// Default: publish to store
					this.handleSubscriptionData(data, config, projectTopic);
				}
			},
			error: config.onError || ((error: any) => {
				console.error(`Subscription error for ${config.entityType}:`, error);
			})
		};
	}

	/**
	 * Handle subscription data by publishing to store
	 */
	private handleSubscriptionData(data: any, config: SubscriptionConfig, projectTopic: string): void {
		if (!data || !data.id) {
			console.warn('Subscription data missing id:', data);
			return;
		}

		// Build topic path
		const topic = this.buildTopicForEntity(data, config.entityType, config.parentEntityType, projectTopic);

		// Publish to store
		this.store.publish(topic, data);
	}

	/**
	 * Build topic path for an entity
	 */
	private buildTopicForEntity(
		entity: any,
		entityType: string,
		parentEntityType: string | undefined,
		parentTopic: string
	): string {
		if (parentEntityType) {
			return toNestedTopicPath(parentTopic, entityType, entity.id);
		}
		return toTopicPath(entityType, entity.id);
	}

	/**
	 * Remove all active subscriptions
	 */
	private removeAllSubscriptions(): void {
		for (const [key, spec] of this.activeSubscriptions.entries()) {
			this.subscriptionClient.removeSubscription(spec);
		}
		this.activeSubscriptions.clear();
	}

	/**
	 * Get the current project ID being synced
	 */
	getCurrentProjectId(): string | null {
		return this.currentProjectId;
	}

	/**
	 * Check if a project is currently being synced
	 */
	isSyncingProject(projectId: string): boolean {
		return this.currentProjectId === projectId;
	}
}
