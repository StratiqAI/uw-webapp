import { error, redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import type { Project } from '@stratiqai/types-simple';
import { gql } from '$lib/realtime/graphql/requestHandler';
import { Q_GET_PROJECT } from '$lib/realtime/graphql/queries/Project';

type GraphQLProjectResponse = {
	getProject: Project | null;
};

export const load: LayoutServerLoad = async ({ params, cookies, url, parent }) => {
	const idToken = cookies.get('id_token');
	if (!idToken) {
		throw error(401, 'Not Authorized');
	}

	const parentData = await parent();

	const { projectId } = params;
	const isNewProjectMode = url.searchParams.get('new') === '1';

	if (isNewProjectMode) {
		return {
			project: null,
			currentUser: parentData.currentUser,
			projects: parentData.projects ?? [],
			isNewProject: true,
			idToken
		};
	}

	try {
		const response = await gql<GraphQLProjectResponse>(
			Q_GET_PROJECT,
			{ id: projectId },
			idToken
		);

		if (!response?.getProject) {
			throw redirect(302, '/p?reason=project-not-found');
		}

		return {
			project: response.getProject,
			currentUser: parentData.currentUser,
			projects: parentData.projects ?? [],
			isNewProject: false,
			idToken
		};

	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err && (err as any).status === 302) {
			throw err;
		}
		console.error('Failed to load project data:', err);
		throw redirect(302, '/p?reason=project-error');
	}
};