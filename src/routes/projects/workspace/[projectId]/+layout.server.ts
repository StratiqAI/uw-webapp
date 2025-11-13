import { error } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

// Import the GraphQL helper for making HTTP requests to AppSync
import { gql } from '$lib/realtime/graphql/requestHandler';

// Import the GraphQL query and mutation strings
import type { Project } from '@stratiqai/types';
import { GraphQLOperationGenerator, ProjectSchemas } from '@stratiqai/types';
const projectGenerator = new GraphQLOperationGenerator("Project", ProjectSchemas);

const Q_GET_PROJECT_BY_ID = projectGenerator.generateGetQuery();

export const load: LayoutServerLoad = async ({ params, cookies, url, parent }) => {
	const parentData = await parent();

	let { projectId } = params;

	const newProject = url.searchParams.get('new');
	// const projectId = url.pathname.split('/').at(-2);

	// console.log('projectId', projectId);
	// console.log('newProject', newProject);

	let projectDocuments: ProjectDocument[] = [];

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
			currentUser: parentData.currentUser,
			documents: [],
			projectDocuments: projectDocuments,
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

	// Documents are now fetched via the documents field on Project
	projectDocuments = response.getProject.documents?.items || [];

	// console.log("documents", JSON.stringify(documents, null, 2));
	return {
		project: response.getProject,
		idToken: idToken,
		currentUser: parentData.currentUser,
		documents: [], // Legacy Document[] type - kept for backward compatibility
		projectDocuments: projectDocuments,
		isNewProject: false
	};
};
