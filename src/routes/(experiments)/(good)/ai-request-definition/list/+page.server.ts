//**********************************************************************************
// AI Query Definition List Page Server Load
// This file loads the AI query definitions data from the server and returns it to the client.
// **********************************************************************************

// SvelteKit Imports
import { error } from '@sveltejs/kit';

// Import the type for the server load function
import type { PageServerLoad } from './$types';

// ---------------------------------------------------------------------------------
// Import the GraphQL helper for making HTTP requests to AppSync
import { gql } from '$lib/realtime/graphql/requestHandler';

// Import the GraphQL query and mutation strings
import { GraphQLOperationGenerator, AIQueryDefinitionSchemas } from '@stratiqai/types';
const aiQueryDefinitionGenerator = new GraphQLOperationGenerator("AIQueryDefinition", AIQueryDefinitionSchemas);
const Q_LIST_AI_QUERY_DEFINITIONS = aiQueryDefinitionGenerator.generateListQuery();

// Import the AIQueryDefinition type definition
import type { AIQueryDefinition } from '@stratiqai/types';

// Define the server-side load function for this page
export const load: PageServerLoad = async ({ params, cookies, url }) => {
	try {
		const idToken = cookies.get('id_token');
		if (!idToken) {
			error(401, 'Not Authorized');
		}

		// Call the GraphQL endpoint with the Q_LIST query and a limit of 50 items
		// The response is expected to have a listAIQueryDefinitions object with an items array
		const response = await gql<{ listAIQueryDefinitions: { items: AIQueryDefinition[]; nextToken?: string | null } }>(
			Q_LIST_AI_QUERY_DEFINITIONS, 
			{ limit: 50 }, 
			idToken
		);
		
		// Check if response is null or undefined
		if (!response) {
			console.error('GraphQL response is null or undefined');
			return { items: [], nextToken: null, idToken: idToken, error: 'No response from GraphQL' };
		}
		
		// Check if listAIQueryDefinitions is null or undefined
		if (!response.listAIQueryDefinitions) {
			console.error('listAIQueryDefinitions is null or undefined in response');
			return { items: [], nextToken: null, idToken: idToken, error: 'listAIQueryDefinitions is null in response' };
		}
		
		// Return the items array to the page as props, with fallback for null/undefined
		return { 
			items: response.listAIQueryDefinitions.items || [], 
			nextToken: response.listAIQueryDefinitions.nextToken || null,
			idToken: idToken 
		};
	} catch (error: any) {
		// If an error occurs, log it and return an empty items array with the error message
		console.error('Error loading data:', error);
		return { items: [], error: error.message };
	}
};

