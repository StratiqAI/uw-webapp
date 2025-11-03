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
// Import the GraphQL query and mutation strings
import { Q_LIST_USER_PROJECTS } from '@stratiqai/types';

// Import the UserItem type definition
import type { Project } from '$lib/types/Project';

// Define the server-side load function for this page
export const load: PageServerLoad = async ({ params, cookies, url }) => {
	try {
		const idToken = cookies.get('id_token');
		if (!idToken) {
			error(401, 'Not Authorized');
		}

		// Call the GraphQL endpoint with the Q_LIST query and a limit of 50 items
		// The response is expected to have a listMyProjects object with an items array
		const response = await gql<{ listMyProjects: { items: Project[]; nextToken?: string | null } }>(Q_LIST_USER_PROJECTS, { limit: 50 }, idToken);
		// Log the full response for debugging purposes
		console.log('GraphQL response:', JSON.stringify(response, null, 2));
		
		// Check if response is null or undefined
		if (!response) {
			console.error('GraphQL response is null or undefined');
			return { items: [], nextToken: null, idToken: idToken, error: 'No response from GraphQL' };
		}
		
		// Check if listMyProjects is null or undefined
		if (!response.listMyProjects) {
			console.error('listMyProjects is null or undefined in response');
			return { items: [], nextToken: null, idToken: idToken, error: 'listMyProjects is null in response' };
		}
		
		// Return the items array to the page as props, with fallback for null/undefined
		return { 
			items: response.listMyProjects.items || [], 
			nextToken: response.listMyProjects.nextToken || null,
			idToken: idToken 
		};
	} catch (error: any) {
		// If an error occurs, log it and return an empty items array with the error message
		console.error('Error loading data:', error);
		return { items: [], error: error.message };
	}
};
