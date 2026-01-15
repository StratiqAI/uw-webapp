// External packages
import { error } from '@sveltejs/kit';
// Local type imports
import type { LayoutServerLoad } from './$types';


// ============================================================================
// 1. SETUP & CONFIGURATION
// ============================================================================

/**
 * Server-side layout loader for project workspace pages.
 * This function loads project data, validates it, and supports handling
 * both the standard view and new project creation flow.
 */
export const load: LayoutServerLoad = async ({ params, cookies, url, parent }) => {

	// ============================================================================
	// 2. AUTHENTICATION CHECK
	// ============================================================================
	// Retrieve JWT auth token from cookies (for API authorization)
	const idToken = cookies.get('id_token');
	if (!idToken) {
		// User is not authorized; respond with 401 error
		throw error(401, 'Not Authorized');
	}

	return {
		idToken                               // Pass idToken for client-side operations
	};
};
