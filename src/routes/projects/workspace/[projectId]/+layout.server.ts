import { error } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { print } from 'graphql';

// External types
import type { Project } from '@agnathan/types-simple';
import { Q_GET_PROJECT } from '@agnathan/types-simple';

// Internal imports
import { gql } from '$lib/realtime/graphql/requestHandler';

// Type to describe the shape of GraphQL response for "getProject"
type GraphQLProjectResponse = {
	getProject: Project | null;
};

/**
 * Server-side layout loader for project workspace pages.
 * Handles authentication, fetches project data, or sets up state for creating a new project.
 */
export const load: LayoutServerLoad = async ({ params, cookies, url, parent }) => {
	// 1. Authentication Check (Fail fast)
	// Retrieve JWT auth token immediately. If missing, stop execution.
	const idToken = cookies.get('id_token');
	if (!idToken) {
		throw error(401, 'Not Authorized');
	}

	// 2. Load Parent Data
	// Await parent() to get currentUser context.
	const parentData = await parent();

	const { projectId } = params;
	// Determine if we are in "create new project" mode via query param.
	const isNewProjectMode = url.searchParams.get('new') === '1';

	// ---------------------------------------------------------
	// Scenario A: New Project Creation Flow
	// ---------------------------------------------------------
	if (isNewProjectMode) {
		// Return stub data. The UI should recognize `project: null` + `isNewProject: true`
		// as the signal to render a creation form.
		return {
			project: null,
			currentUser: parentData.currentUser,
			isNewProject: true,
			idToken // Pass idToken for client-side mutations (e.g., creating the project)
		};
	}

	// ---------------------------------------------------------
	// Scenario B: Existing Project View Flow
	// ---------------------------------------------------------
	try {
		const response = await gql<GraphQLProjectResponse>(
			print(Q_GET_PROJECT),
			{ id: projectId },
			idToken
		);

		if (!response?.getProject) {
			// Distinguish between a failed fetch and a successful fetch returned null
			throw error(404, 'Project not found');
		}

		// Note: Data validation is currently handled by TypeScript types from
		// @agnathan/types-simple. If runtime validation (e.g., Zod) is needed in the future,
		// add it here before returning.

		return {
			project: response.getProject,
			currentUser: parentData.currentUser,
			isNewProject: false,
			idToken
		};

	} catch (err) {
		// If the error is already a SvelteKit error (like the 404 above), re-throw it.
		if (err instanceof Error && 'status' in err) {
			throw err;
		}
		
		// Log unexpected errors and throw a generic 500.
		console.error('Failed to load project data:', err);
		// It's often safer not to expose the raw error message to the client in production
		throw error(500, 'An internal error occurred while loading project data.');
	}
};