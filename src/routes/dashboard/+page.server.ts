// +page.server.ts
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { gql } from '$lib/realtime/graphql/requestHandler';
import { GraphQLOperationGenerator, ProjectSchemas } from '@stratiqai/types';
import type { Project } from '@stratiqai/types';

const projectGenerator = new GraphQLOperationGenerator('Project', ProjectSchemas);
const Q_LIST_USER_PROJECTS = projectGenerator.generateListQuery();

export const load: PageServerLoad = async ({ cookies }) => {
	const idToken = cookies.get('id_token');
	if (!idToken) {
		throw error(401, 'Not Authorized');
	}

	// Fetch projects for the project switcher
	let projects: Project[] = [];
	try {
		const response = await gql<{ listProjects: { items: Project[]; nextToken?: string | null } }>(
			Q_LIST_USER_PROJECTS,
			{ limit: 50 },
			idToken
		);
		projects = response?.listProjects?.items || [];
	} catch (err) {
		console.error('Failed to load projects:', err);
		// Continue without projects - user can still use dashboard
	}

	return {
		idToken,
		projects
	};
};