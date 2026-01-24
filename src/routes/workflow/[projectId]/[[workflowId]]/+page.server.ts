// +page.server.ts
import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { gql } from '$lib/realtime/graphql/requestHandler';
import { Q_LIST_PROJECTS, Q_GET_PROJECT } from '@stratiqai/types-simple';
import type { Project, Workflow } from '@stratiqai/types-simple';

export const load: PageServerLoad = async ({ params, cookies }) => {
	const idToken = cookies.get('id_token');
	if (!idToken) {
		throw error(401, 'Not Authorized');
	}

	const projectId = params.projectId;
	const workflowId = params.workflowId;

	// Fetch projects for the project switcher
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
		// Continue without projects - user can still use workflow editor
	}

	// If projectId is provided, validate it exists
	let project: Project | null = null;
	if (projectId) {
		try {
			const response = await gql<{ getProject: Project | null }>(
				Q_GET_PROJECT,
				{ id: projectId },
				idToken
			);
			project = response?.getProject;
			
			// If project doesn't exist and we have projects, redirect to first project
			if (!project && projects.length > 0) {
				throw redirect(302, `/workflow/${projects[0].id}`);
			}
			
			// If project doesn't exist and no projects, redirect to workflow without projectId
			if (!project) {
				throw redirect(302, '/workflow');
			}
		} catch (err) {
			// If it's a redirect, re-throw it
			if (err && typeof err === 'object' && 'status' in err && err.status === 302) {
				throw err;
			}
			console.error('Failed to load project:', err);
		}
	}

	// If workflowId is provided, validate it exists in the project
	let workflow: Workflow | null = null;
	if (workflowId && project) {
		const workflows = project.workflows?.items || [];
		workflow = workflows.find((w) => w.id === workflowId) || null;
	}

	return {
		idToken,
		projects,
		projectId: projectId || null,
		workflowId: workflowId || null,
		project,
		workflow
	};
};
