import { PUBLIC_GRAPHQL_HTTP_ENDPOINT } from "$env/static/public";
import { logger } from "$lib/logging/debug";
import { print, type DocumentNode } from "graphql";

/**
 * Executes a GraphQL query or mutation against the AppSync HTTP endpoint.
 *
 * @template T - The expected shape of the response data.
 * @param {string | DocumentNode} query - The GraphQL query or mutation string, or a DocumentNode from graphql-tag.
 * @param {Record<string, any>} [variables={}] - Variables for the GraphQL operation.
 * @param {string} idToken - The Cognito ID token for authentication.
 * @returns {Promise<T>} - Resolves with the data returned from the GraphQL endpoint.
 * @throws {Error} - Throws if the response contains GraphQL errors.
 */
export async function gql<T>(
	query: string | DocumentNode,
	variables: Record<string, any> = {},
	idToken: string
): Promise<T> {
	// Convert DocumentNode to string if needed
	const queryString = typeof query === 'string' ? query : print(query);
	
	const headers: Record<string, string> = {
		'content-type': 'application/json',
		Authorization: idToken
	};
	// console.log('GraphQL Request ------------------------------------');
	// console.log('Endpoint:', PUBLIC_GRAPHQL_HTTP_ENDPOINT);
	// console.log('Variables:', variables);
	// console.log('----------------------------------------------------');
	const res = await fetch(PUBLIC_GRAPHQL_HTTP_ENDPOINT, {
		method: 'POST',
		headers,
		body: JSON.stringify({ query: queryString, variables })
	});
	
	if (!res.ok) {
		console.error('GraphQL HTTP error:', res.status, res.statusText);
		const text = await res.text();
		console.error('Response body:', text);
		throw new Error(`HTTP ${res.status}: ${res.statusText}`);
	}
	
	const body = await res.json();
	// console.log('GraphQL Response:', JSON.stringify(body, null, 2));
	
	if (body.errors?.length) {
		console.error('GraphQL errors:', body.errors);
		throw new Error(body.errors.map((e: any) => e.message).join('; '));
	}
	return body.data as T;
}
