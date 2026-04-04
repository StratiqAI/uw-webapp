import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import type { Workflow } from '@stratiqai/types-simple';

export const load: PageServerLoad = async ({ params, parent }) => {
	const parentData = await parent();

	if (!parentData.idToken) {
		throw error(401, 'Not Authorized');
	}

	const { projectId, workflowId } = params;
	const project = parentData.project;

	if (!project) {
		throw redirect(302, '/p');
	}

	let workflow: Workflow | null = null;
	if (workflowId && project) {
		const workflows = project.workflows?.items || [];
		workflow = workflows.find((w) => w.id === workflowId) || null;
	}

	return {
		idToken: parentData.idToken,
		projects: parentData.projects ?? [],
		projectId: projectId || null,
		workflowId: workflowId || null,
		project,
		workflow
	};
};
