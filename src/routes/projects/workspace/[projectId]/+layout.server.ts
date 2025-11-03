import { error } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { Q_GET_PROJECT_BY_ID } from '$lib/realtime/graphql/queries/Project';
import { Q_DOCUMENT_BY_ID } from '$lib/realtime/graphql/queries/Document';
import { gql } from '$lib/realtime/graphql/requestHandler';
import type { Project } from '$lib/types/Project';
import type { Document } from '$lib/types/Document';
import { Q_INSIGHT_BY_DOCHASH } from '$lib/realtime/graphql/queries/Insight';
import type { Insight } from '$lib/types/Insight';

export const load: LayoutServerLoad = async ({ params, cookies, url }) => {
	// console.log('Starting layout.server.ts');
	// console.log('url', url);
	// console.log('params', params);
	let { projectId } = params;

	const newProject = url.searchParams.get('new');
	// const projectId = url.pathname.split('/').at(-2);

	// console.log('projectId', projectId);
	// console.log('newProject', newProject);

	let documents: Document[] = [];

	const idToken = cookies.get('id_token');
	if (!idToken) {
		throw error(401, 'Not Authorized');
	}

	// If this is a new project request, return empty data without trying to fetch the project
	if (newProject === '1') {
		console.log('New project requested, returning empty data');
		return {
			project: null,
			idToken: idToken,
			documents: documents,
			isNewProject: true
		};
	}

	const response = await gql<{ getProject: Project }>(Q_GET_PROJECT_BY_ID, { id: projectId }, idToken);
	// console.log("response", response);
	if (!response) {
		throw error(404, 'Project not found');
	}

	if (!response.getProject) {
		throw error(404, 'Project not found');
	}

	// TODO: Documents relationship needs to be re-implemented
	// The new schema doesn't have a documents field on Project
	// Documents may need to be queried separately or linked differently

	// console.log("documents", JSON.stringify(documents, null, 2));
	return {
		project: response.getProject,
		idToken: idToken,
		documents: documents,
		isNewProject: false
	};
};
