/**
 * GraphQL Store Publisher Module
 * 
 * Exports for the GraphQL-to-ValidatedTopicStore synchronization system.
 */

export { GraphQLStorePublisher } from './GraphQLStorePublisher';
export { GraphQLQueryClient, type IGraphQLQueryClient } from './GraphQLQueryClient';
export { EntitySyncManager } from './EntitySyncManager';
export {
	toTopicPath,
	toNestedTopicPath,
	extractTopicPath,
	getBasePathFromPattern,
	buildSchemaPattern,
	buildNestedSchemaPattern
} from './TopicMapper';
export {
	createProjectSyncConfig,
	createEntitySyncConfig
} from './EntitySyncHelpers';
export type {
	GraphQLStorePublisherOptions,
	ProjectSyncConfig,
	SubscriptionConfig,
	EntitySchemaConfig
} from './types';
export type {
	EntitySyncConfig,
	EntitySyncOptions,
	EntitySyncResult
} from './EntitySyncConfig';
export type {
	EntitySyncManagerOptions
} from './EntitySyncManager';