import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, parent }) => {
	const parentData = await parent();
	if (!parentData.idToken) {
		throw error(401, 'Not Authorized');
	}
	return {
		idToken: parentData.idToken,
		projectId: params.projectId,
		project: parentData.project
	};
};
