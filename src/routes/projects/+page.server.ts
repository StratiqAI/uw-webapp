//**********************************************************************************
// Projects Page Server Load
// This file loads the projects data from the server and returns it to the client.
// **********************************************************************************

// SvelteKit Imports
import { error } from '@sveltejs/kit';

// Import the type for the server load function
import type { PageServerLoad } from './$types';

// ---------------------------------------------------------------------------------
// Import the GraphQL helper for making HTTP requests to AppSync
import { gql } from '$lib/realtime/graphql/requestHandler';

// Import GraphQL operations from the new types library
import { Q_LIST_PROJECTS } from '@stratiqai/types-simple/operations';
import { print } from 'graphql';

// Import the Project type definition
import type { Project } from '@stratiqai/types-simple';

// Define the server-side load function for this page
export const load: PageServerLoad = async ({ params, cookies, url }) => {
	try {
		const idToken = cookies.get('id_token');
		if (!idToken) {
			error(401, 'Not Authorized');
		}

		// Call the GraphQL endpoint with the Q_LIST query and a limit of 50 items
		// The response is expected to have a listProjects object with an items array
		// Default scope is 'OWNED_BY_ME' to show user's own projects
		// Validate scope against ListScope enum values
		const validScopes = ['OWNED_BY_ME', 'SHARED_WITH_ME', 'ALL_TENANT'] as const;
		const requestedScope = url.searchParams.get('scope');
		const scope = (requestedScope && validScopes.includes(requestedScope as any)) 
			? requestedScope 
			: 'OWNED_BY_ME';
		const nextToken = url.searchParams.get('nextToken') || undefined;
		const response = await gql<{ listProjects: { items: Project[]; nextToken?: string | null } }>(
			print(Q_LIST_PROJECTS), 
			{ limit: 50, nextToken, scope }, 
			idToken
		);
		// Log the full response for debugging purposes
		// console.log('GraphQL response:', JSON.stringify(response, null, 2));
		
		// Check if response is null or undefined
		if (!response) {
			console.error('GraphQL response is null or undefined');
			return { items: [], nextToken: null, idToken: idToken, error: 'No response from GraphQL' };
		}
		
		// Check if listProjects is null or undefined
		if (!response.listProjects) {
			console.error('listProjects is null or undefined in response');
			return { items: [], nextToken: null, idToken: idToken, error: 'listProjects is null in response' };
		}
		
		// Return the items array to the page as props, with fallback for null/undefined
		return { 
			items: response.listProjects.items || [], 
			nextToken: response.listProjects.nextToken || null,
			idToken: idToken,
			scope: scope
		};
	} catch (error: any) {
		// If an error occurs, log it and return an empty items array with the error message
		console.error('Error loading data:', error);
		return { items: [], error: error.message };
	}
};
