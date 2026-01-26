// +page.server.ts - Redirect to first project or show workflow selector
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { gql } from '$lib/realtime/graphql/requestHandler';
import { Q_LIST_PROJECTS } from '@agnathan/types-simple';
import type { Project } from '@agnathan/types-simple';

export const load: PageServerLoad = async ({ cookies }) => {
	const idToken = cookies.get('id_token');
	if (!idToken) {
		throw redirect(302, '/auth/login');
	}

	// Fetch projects
	let projects: Project[] = [];
	try {
		const response = await gql<{ listProjects: { items: Project[]; nextToken?: string | null } }>(
			Q_LIST_PROJECTS,
			{ limit: 50 },
			idToken
		);
		projects = response?.listProjects?.items || [];
	} catch (err) {
		console.error('Failed to load projects:', err);
	}

	// If we have projects, redirect to the first one
	if (projects.length > 0) {
		throw redirect(302, `/workflow/${projects[0].id}`);
	}

	// Otherwise, return data for a workflow selector page (if we want to create one)
	return {
		idToken,
		projects
	};
};
