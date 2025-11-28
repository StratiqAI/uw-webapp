// External packages
import { error } from '@sveltejs/kit';
import { ProjectSchemas } from '@stratiqai/types';
import type { Project } from '@stratiqai/types';

// Internal imports
import { gql } from '$lib/realtime/graphql/requestHandler';
import { Q_GET_PROJECT_BY_ID_WITH_DOCLINKS } from '$lib/realtime/graphql/queries/Project';

// Local type imports
import type { LayoutServerLoad } from './$types';

/**
 * STEP-BY-STEP OVERVIEW:
 * 
 * This server-side layout loader handles data loading for project workspace pages.
 * It runs on the server before rendering, ensuring authenticated access and data validation.
 * 
 * EXECUTION FLOW:
 * 
 * 1. SETUP & CONFIGURATION
 *    - Initialize Zod schema for validating project data from the API
 *    - Create a GraphQL operation generator for the Project model
 *    - Generate a GraphQL query string for fetching projects with relations
 * 
 * 2. AUTHENTICATION CHECK
 *    - Extract JWT token from cookies
 *    - If no token exists, throw 401 Unauthorized error
 * 
 * 3. PARENT DATA LOADING
 *    - Await parent() to get data from ancestor layouts (e.g., currentUser)
 *    - Extract projectId from route parameters
 *    - Check URL query params for "?new=1" flag
 * 
 * 4. NEW PROJECT FLOW (if ?new=1)
 *    - Skip API fetch entirely
 *    - Return stub data with project: null, empty documents, isNewProject: true
 *    - This allows the UI to render a "create new project" form
 * 
 * 5. EXISTING PROJECT FLOW (normal case)
 *    - Execute GraphQL query to fetch project by ID (including related documents)
 *    - If project not found, throw 404 Not Found error
 * 
 * 6. DATA VALIDATION
 *    - Validate the API response against the Zod schema
 *    - If validation fails, log error and throw 500 Internal Server Error
 *    - This ensures type safety and catches API contract violations early
 * 
 * 7. DATA TRANSFORMATION
 *    - Extract document links from the project
 *    - Handle both array format and GraphQL Connection format ({ items: [...] })
 *    - Normalize to a simple array for consistent consumption by components
 * 
 * 8. RETURN DATA
 *    - Return validated project, projectId, currentUser, documents array, and isNewProject flag
 *    - This data becomes available to all child routes and components via the $page store
 */

// ============================================================================
// 1. SETUP & CONFIGURATION
// ============================================================================

// Use Zod schema for validating project data received from API
const projectSchema = ProjectSchemas.schema;

// Type to describe the shape of GraphQL response for "getProject"
type GraphQLProjectResponse = {
	getProject: Project | null;
};

/**
 * Server-side layout loader for project workspace pages.
 * This function loads project data, validates it, and supports handling
 * both the standard view and new project creation flow.
 */
export const load: LayoutServerLoad = async ({ params, cookies, url, parent }) => {
	// ============================================================================
	// 3. PARENT DATA LOADING
	// ============================================================================
	// Await parent() to get currentUser and potentially other ancestor-provided data
	const parentData = await parent();
	const { projectId } = params;
	// Check if the URL query string has "?new=1" to indicate new project creation
	const newProject = url.searchParams.get('new');

	// ============================================================================
	// 2. AUTHENTICATION CHECK
	// ============================================================================
	// Retrieve JWT auth token from cookies (for API authorization)
	const idToken = cookies.get('id_token');
	if (!idToken) {
		// User is not authorized; respond with 401 error
		throw error(401, 'Not Authorized');
	}

	// ============================================================================
	// 4. NEW PROJECT FLOW (if ?new=1)
	// ============================================================================
	// If creating a new project (when ?new=1): do not fetch from API, just prepare stub result
	if (newProject === '1') {
		return {
			project: null,                    // No project data for new project
			projectId,                        // Pass along projectId (usually "new")
			currentUser: parentData.currentUser,
			documents: [],                    // No documents for new project yet
			isNewProject: true                // Indicates this is a "new" (not existing) project
		};
	}

	// ============================================================================
	// 5. EXISTING PROJECT FLOW (normal case)
	// ============================================================================
	// Fetch the project from the GraphQL API using the generated query and projectId
	const response = await gql<GraphQLProjectResponse>(
		Q_GET_PROJECT_BY_ID_WITH_DOCLINKS,
		{ id: projectId },
		idToken // Pass the AWS Cognito ID Token for authentication
	);

	console.log('response', response);

	// If no project found, respond with 404 (Not Found)
	if (!response?.getProject) {
		throw error(404, 'Project not found');
	}

	// ============================================================================
	// 6. DATA VALIDATION
	// ============================================================================
	// Validate the received project data against the Zod schema
	const validationResult = projectSchema.safeParse(response.getProject);
	if (!validationResult.success) {
		// If validation fails, log detailed error information and return 500 (Internal Server Error)
		console.error('Project validation failed:', JSON.stringify(validationResult.error.errors, null, 2));
		console.error('Received project data:', JSON.stringify(response.getProject, null, 2));
		throw error(500, 'Invalid project data received from server');
	}

	const project = validationResult.data;
	// const project = response.getProject;
	// ============================================================================
	// 7. RETURN DATA
	// ============================================================================
	// Return the extracted/validated data to the page
	return {
		project,                              // Fully validated project data
		currentUser: parentData.currentUser,  // Carry currentUser forward for authorization/user context
		isNewProject: false                   // Not a new project: this is loaded from API
	};
};
