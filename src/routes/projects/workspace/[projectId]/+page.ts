import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params }) => {
	// Redirect to get-started page when accessing the base workspace URL
	throw redirect(302, `/projects/workspace/${params.projectId}/document-analysis`);
};
