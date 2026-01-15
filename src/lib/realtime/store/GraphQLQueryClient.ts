/**
 * GraphQLQueryClient
 * 
 * Simple wrapper around the gql() function that implements an interface
 * for dependency injection and testability.
 * 
 * This allows the GraphQLStorePublisher to use any query client implementation,
 * making it easier to test and potentially swap implementations.
 */

import type { DocumentNode } from 'graphql';
import { gql } from '../graphql/requestHandler';

/**
 * Interface for GraphQL query clients
 */
export interface IGraphQLQueryClient {
	/**
	 * Execute a GraphQL query or mutation
	 * 
	 * @param query - GraphQL query string or DocumentNode
	 * @param variables - Query variables
	 * @returns Promise resolving to the query result data
	 */
	query<T = any>(query: string | DocumentNode, variables?: Record<string, any>): Promise<T>;
}

/**
 * Implementation of IGraphQLQueryClient using the existing gql() function
 */
export class GraphQLQueryClient implements IGraphQLQueryClient {
	constructor(private idToken: string) {
		if (!idToken) {
			throw new Error('ID token is required for GraphQL queries');
		}
	}

	async query<T = any>(query: string | DocumentNode, variables?: Record<string, any>): Promise<T> {
		return await gql<T>(query, variables || {}, this.idToken);
	}
}
