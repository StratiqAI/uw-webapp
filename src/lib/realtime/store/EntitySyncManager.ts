/**
 * EntitySyncManager
 * 
 * Manages synchronization of entities with GraphQL queries and subscriptions.
 * 
 * This class simplifies the common pattern of:
 * - Querying for entities (list or single)
 * - Publishing entities to ValidatedTopicStore
 * - Setting up update and delete subscriptions
 * - Managing subscription lifecycle
 * 
 * Usage:
 * ```typescript
 * const config: EntitySyncConfig<Project> = {
 *   entityType: 'projects',
 *   listQuery: Q_LIST_PROJECTS,
 *   getQuery: Q_GET_PROJECT,
 *   updateSubscription: S_ON_UPDATE_PROJECT,
 *   deleteSubscription: S_ON_DELETE_PROJECT,
 *   getEntityId: (project) => project.id
 * };
 * 
 * const manager = new EntitySyncManager({
 *   queryClient,
 *   subscriptionClient,
 *   store,
 *   config
 * });
 * 
 * // Query and sync list
 * const result = await manager.syncList({ setupSubscriptions: true });
 * 
 * // Query and sync single entity
 * await manager.syncOne('project-123', { setupSubscriptions: true });
 * 
 * // Cleanup
 * manager.cleanup();
 * ```
 */

import type { DocumentNode } from 'graphql';
import type { SubscriptionSpec } from '../websocket/types';
import type { IGraphQLQueryClient } from './GraphQLQueryClient';
import type { AppSyncWsClient } from '../websocket/AppSyncWsClient';
import type { EntitySyncConfig, EntitySyncOptions, EntitySyncResult } from './EntitySyncConfig';
import { toTopicPath } from './TopicMapper';

/**
 * ValidatedTopicStore interface (to avoid circular dependency)
 */
interface IValidatedTopicStore {
	publish<T = any>(topic: string, value: T): boolean;
	delete(topic: string): void;
	clearAllAt(path: string, options?: { exclude?: string[] }): void;
}

/**
 * Options for EntitySyncManager constructor
 */
export interface EntitySyncManagerOptions<T = any> {
	/** Query client for HTTP GraphQL queries */
	queryClient: IGraphQLQueryClient;
	/** Subscription client for WebSocket GraphQL subscriptions */
	subscriptionClient: AppSyncWsClient;
	/** ValidatedTopicStore instance */
	store: IValidatedTopicStore;
	/** Entity sync configuration */
	config: EntitySyncConfig<T>;
}

/**
 * EntitySyncManager class
 */
export class EntitySyncManager<T extends { id: string } = any> {
	private queryClient: IGraphQLQueryClient;
	private subscriptionClient: AppSyncWsClient;
	private store: IValidatedTopicStore;
	private config: EntitySyncConfig<T>;
	private activeSubscriptions: Map<string, SubscriptionSpec<any>> = new Map();
	
	constructor(options: EntitySyncManagerOptions<T>) {
		this.queryClient = options.queryClient;
		this.subscriptionClient = options.subscriptionClient;
		this.store = options.store;
		this.config = options.config;
	}
	
	/**
	 * Query and sync a list of entities
	 */
	async syncList(options: EntitySyncOptions = {}): Promise<EntitySyncResult<T>> {
		const {
			queryVariables = {},
			setupSubscriptions = false,
			clearExisting = false
		} = options;
		
		// Clear existing data if requested
		if (clearExisting) {
			this.store.clearAllAt(this.config.entityType);
		}
		
		// Build query variables
		const variables = this.config.buildListVariables
			? this.config.buildListVariables(queryVariables)
			: queryVariables;
		
		// Execute query
		const result = await this.queryClient.query(this.config.listQuery, variables);
		
		// Extract entities from response
		const entities = this.extractEntitiesFromListResponse(result);
		
		// Publish each entity to store
		for (const entity of entities) {
			const id = this.config.getEntityId(entity);
			if (id) {
				const topic = toTopicPath(this.config.entityType, id);
				this.store.publish(topic, entity);
			}
		}
		
		// Set up subscriptions if requested
		if (setupSubscriptions) {
			this.setupSubscriptionsForEntities(entities);
		}
		
		return {
			entities,
			count: entities.length,
			subscriptionsEnabled: setupSubscriptions
		};
	}
	
	/**
	 * Query and sync a single entity by ID
	 */
	async syncOne(entityId: string, options: EntitySyncOptions = {}): Promise<T | null> {
		const { setupSubscriptions = false } = options;
		
		// Build query variables
		const variables = this.config.buildGetVariables
			? this.config.buildGetVariables(entityId)
			: { id: entityId };
		
		// Execute query
		const result = await this.queryClient.query(this.config.getQuery, variables);
		
		// Extract entity from response
		const entity = this.extractEntityFromGetResponse(result);
		
		if (!entity) {
			return null;
		}
		
		// Publish to store
		const topic = toTopicPath(this.config.entityType, entityId);
		this.store.publish(topic, entity);
		
		// Set up subscriptions if requested
		if (setupSubscriptions) {
			this.setupSubscriptionsForEntities([entity]);
		}
		
		return entity;
	}
	
	/**
	 * Set up update and delete subscriptions for entities
	 */
	setupSubscriptionsForEntities(entities: T[]): void {
		// Clean up existing subscriptions for these entities
		for (const entity of entities) {
			const id = this.config.getEntityId(entity);
			if (!id) continue;
			
			const updateKey = `update-${id}`;
			const deleteKey = `delete-${id}`;
			
			if (this.activeSubscriptions.has(updateKey)) {
				const existingSpec = this.activeSubscriptions.get(updateKey);
				if (existingSpec) {
					this.subscriptionClient.removeSubscription(existingSpec);
					this.activeSubscriptions.delete(updateKey);
				}
			}
			
			if (this.activeSubscriptions.has(deleteKey)) {
				const existingSpec = this.activeSubscriptions.get(deleteKey);
				if (existingSpec) {
					this.subscriptionClient.removeSubscription(existingSpec);
					this.activeSubscriptions.delete(deleteKey);
				}
			}
		}
		
		// Set up subscriptions for each entity
		for (const entity of entities) {
			const id = this.config.getEntityId(entity);
			if (!id) continue;
			
			// Update subscription
			const updateVariables = this.config.buildUpdateVariables
				? this.config.buildUpdateVariables(id)
				: { id };
			
			const updateSpec: SubscriptionSpec<T> = {
				query: this.config.updateSubscription,
				variables: updateVariables,
				path: this.config.updateSubscriptionPath,
				next: (updatedEntity: T) => {
					const topic = toTopicPath(this.config.entityType, this.config.getEntityId(updatedEntity));
					this.store.publish(topic, updatedEntity);
					if (this.config.onUpdate) {
						this.config.onUpdate(updatedEntity);
					}
				},
				error: (err: any) => {
					if (this.config.onSubscriptionError) {
						this.config.onSubscriptionError(err, id, 'update');
					}
				}
			};
			
			this.subscriptionClient.addSubscription(updateSpec);
			this.activeSubscriptions.set(`update-${id}`, updateSpec);
			
			// Delete subscription
			const deleteVariables = this.config.buildDeleteVariables
				? this.config.buildDeleteVariables(id)
				: { id };
			
			const deleteSpec: SubscriptionSpec<T> = {
				query: this.config.deleteSubscription,
				variables: deleteVariables,
				path: this.config.deleteSubscriptionPath,
				next: (deletedEntity: T) => {
					const topic = toTopicPath(this.config.entityType, this.config.getEntityId(deletedEntity));
					this.store.delete(topic);
					if (this.config.onDelete) {
						this.config.onDelete(deletedEntity);
					}
				},
				error: (err: any) => {
					if (this.config.onSubscriptionError) {
						this.config.onSubscriptionError(err, id, 'delete');
					}
				}
			};
			
			this.subscriptionClient.addSubscription(deleteSpec);
			this.activeSubscriptions.set(`delete-${id}`, deleteSpec);
		}
	}
	
	/**
	 * Remove subscriptions for specific entities
	 */
	removeSubscriptionsForEntities(entityIds: string[]): void {
		for (const id of entityIds) {
			const updateKey = `update-${id}`;
			const deleteKey = `delete-${id}`;
			
			if (this.activeSubscriptions.has(updateKey)) {
				const spec = this.activeSubscriptions.get(updateKey);
				if (spec) {
					this.subscriptionClient.removeSubscription(spec);
					this.activeSubscriptions.delete(updateKey);
				}
			}
			
			if (this.activeSubscriptions.has(deleteKey)) {
				const spec = this.activeSubscriptions.get(deleteKey);
				if (spec) {
					this.subscriptionClient.removeSubscription(spec);
					this.activeSubscriptions.delete(deleteKey);
				}
			}
		}
	}
	
	/**
	 * Clean up all subscriptions
	 */
	cleanup(): void {
		for (const [key, spec] of this.activeSubscriptions.entries()) {
			this.subscriptionClient.removeSubscription(spec);
		}
		this.activeSubscriptions.clear();
	}
	
	/**
	 * Extract entities from list query response
	 */
	private extractEntitiesFromListResponse(response: any): T[] {
		if (this.config.listResponsePath) {
			// Use dot notation path (e.g., 'listProjects.items')
			const parts = this.config.listResponsePath.split('.');
			let result = response;
			for (const part of parts) {
				result = result?.[part];
			}
			return Array.isArray(result) ? result : [];
		}
		
		// Default: try common patterns
		if (Array.isArray(response)) {
			return response;
		}
		
		// Try to find items array in response
		const keys = Object.keys(response || {});
		for (const key of keys) {
			const value = response[key];
			if (value?.items && Array.isArray(value.items)) {
				return value.items;
			}
			if (Array.isArray(value)) {
				return value;
			}
		}
		
		return [];
	}
	
	/**
	 * Extract entity from get query response
	 */
	private extractEntityFromGetResponse(response: any): T | null {
		if (this.config.getResponsePath) {
			// Use dot notation path (e.g., 'getProject')
			const parts = this.config.getResponsePath.split('.');
			let result = response;
			for (const part of parts) {
				result = result?.[part];
			}
			return result || null;
		}
		
		// Default: try common patterns
		if (response && typeof response === 'object') {
			// Try common GraphQL query response patterns
			const keys = Object.keys(response);
			for (const key of keys) {
				if (key.startsWith('get') || key.toLowerCase().includes('project')) {
					return response[key] || null;
				}
			}
			// Return first object value
			const firstKey = keys[0];
			return response[firstKey] || null;
		}
		
		return null;
	}
	
	/**
	 * Get active subscription count
	 */
	getActiveSubscriptionCount(): number {
		return this.activeSubscriptions.size;
	}
	
	/**
	 * Check if subscriptions are active for an entity
	 */
	hasSubscriptionsForEntity(entityId: string): boolean {
		return this.activeSubscriptions.has(`update-${entityId}`) ||
			   this.activeSubscriptions.has(`delete-${entityId}`);
	}
}
