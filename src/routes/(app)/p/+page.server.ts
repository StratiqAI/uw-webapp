// Server-side loader for the Projects page.
// Fetches a paged list of projects from AppSync and returns it to the client.

// SvelteKit
import { error } from '@sveltejs/kit';

// Server load type
import type { PageServerLoad } from './$types';

// AppSync GraphQL request helper
import { gql } from '$lib/services/realtime/graphql/requestHandler';

// GraphQL operation
import { Q_LIST_PROJECTS } from '@stratiqai/types-simple';
import { print } from 'graphql';

// Types
import type { Project } from '@stratiqai/types-simple';
import { createLogger } from '$lib/utils/logger';

const log = createLogger('app');

// Server-side load
export const load: PageServerLoad = async ({ cookies, url }) => {
	try {
		const idToken = cookies.get('id_token');
		if (!idToken) {
			throw error(401, 'Not Authorized');
		}

		// Parse and validate query params (scope + pagination).
		// Default scope is 'OWNED_BY_ME' to show the caller's projects.
		const validScopes = ['OWNED_BY_ME', 'SHARED_WITH_ME', 'ALL_TENANT'] as const;
		const requestedScope = url.searchParams.get('scope');
		const scope = validScopes.includes(requestedScope as (typeof validScopes)[number])
			? requestedScope
			: 'OWNED_BY_ME';
		const nextToken = url.searchParams.get('nextToken') || undefined;
		const response = await gql<{ listProjects: { items: Project[]; nextToken?: string | null } }>(
			print(Q_LIST_PROJECTS), 
			{ limit: 50, nextToken, scope }, 
			idToken
		);
		// Ensure the response shape is what the UI expects.
		if (!response?.listProjects) {
			throw error(502, 'Invalid response from GraphQL');
		}
		
		// Return data to the page (with safe fallbacks for optional fields).
		return { 
			items: response.listProjects.items || [], 
			nextToken: response.listProjects.nextToken || null,
			idToken,
			scope
		};
	} catch (err: any) {
		log.error('Error loading data:', err);
		if (err?.status) {
			throw err;
		}
		throw error(500, err?.message || 'Failed to load projects');
	}
};
